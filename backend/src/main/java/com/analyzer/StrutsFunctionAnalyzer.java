package com.analyzer;

import java.io.*;
import java.util.*;
import java.nio.file.*;
import java.util.regex.*;
import java.util.stream.Collectors;

public class StrutsFunctionAnalyzer {
    private Map<String, Set<String>> functionCalls = new HashMap<>();
    private Set<String> projectPackages = new HashSet<>();
    private Set<String> blacklistedMethods = new HashSet<>();
    private Pattern actionPattern = Pattern.compile("public\\s+(?:class|interface)\\s+(\\w+)Action");
    private Pattern methodPattern = Pattern.compile("(?:public|protected|private)?\\s+(?:static\\s+)?(?:[\\w.<>\\[\\]]+\\s+)?(\\w+)\\s*\\([^)]*\\)");
    private Pattern methodCallPattern = Pattern.compile("(\\w+)\\s*\\([^)]*\\)");
    private Pattern packagePattern = Pattern.compile("package\\s+([\\w.]+);");
    private Pattern importPattern = Pattern.compile("import\\s+([\\w.]+\\*?);");
    private Map<String, PackageMetadata> packageMetadata = new HashMap<>();
    private Map<String, ClassMetadata> classMetadata = new HashMap<>();
    private Pattern annotationPattern = Pattern.compile("@(\\w+)(?:\\([^)]*\\))?");
    private Pattern classPattern = Pattern.compile("(?:public|protected|private)?\\s+(?:abstract\\s+)?class\\s+(\\w+)(?:\\s+extends\\s+(\\w+))?(?:\\s+implements\\s+([^{]+))?");
    private Map<String, NodeData> nodesMap = new HashMap<>();  // Store all method nodes


    public void loadBlacklist(String blacklistFile) throws IOException {
        if (blacklistFile != null && !blacklistFile.isEmpty()) {
            try (BufferedReader reader = new BufferedReader(new FileReader(blacklistFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (!line.isEmpty() && !line.startsWith("#")) {  // Skip empty lines and comments
                        blacklistedMethods.add(line);
                    }
                }
            }
        }
    }

    private boolean isBlacklisted(String methodName) {
        return blacklistedMethods.contains(methodName);
    }

    public void analyzeDirectory(String directoryPath) throws IOException {
        // First pass: collect all project packages
        Files.walk(Paths.get(directoryPath))
            .filter(Files::isRegularFile)
            .filter(path -> path.toString().endsWith(".java"))
            .forEach(this::collectPackage);

        // Second pass: analyze function calls
        Files.walk(Paths.get(directoryPath))
            .filter(Files::isRegularFile)
            .filter(path -> path.toString().endsWith(".java"))
            .forEach(this::analyzeFile);
    }

    private void collectPackage(Path filePath) {
        try {
            String content = new String(Files.readAllBytes(filePath));
            Matcher packageMatcher = packagePattern.matcher(content);
            if (packageMatcher.find()) {
                String packageName = packageMatcher.group(1);
                projectPackages.add(packageName);
            }
        } catch (IOException e) {
            System.err.println("Error collecting package from file: " + filePath);
        }
    }

    protected void analyzeFile(Path filePath) {
        try {
            String content = new String(Files.readAllBytes(filePath));
            String currentPackage = extractPackage(content);
            String currentClass = extractClassName(content);
            Set<String> imports = extractImports(content);

            if (currentClass != null && currentPackage != null) {
                String fullClassName = currentPackage + "." + currentClass;

                // Create or update package metadata
                packageMetadata.putIfAbsent(currentPackage, new PackageMetadata(currentPackage));
                PackageMetadata pkg = packageMetadata.get(currentPackage);
                pkg.totalClasses++;

                // Create or update class metadata
                ClassMetadata classData = new ClassMetadata(currentClass, currentPackage);
                classData.isAction = currentClass.endsWith("Action");
                extractClassMetadata(content, classData);
                classMetadata.put(fullClassName, classData);

                // Analyze methods
                Matcher methodMatcher = methodPattern.matcher(content);
                while (methodMatcher.find()) {
                    String methodName = methodMatcher.group(1);
                    String fullMethodName = fullClassName + "." + methodName;

                    if (!isBlacklisted(methodName)) {
                        NodeData nodeData = new NodeData(fullMethodName);
                        nodeData.isAction = classData.isAction;
                        nodeData.accessLevel = extractAccessLevel(methodMatcher.group());
                        nodeData.isStatic = methodMatcher.group().contains("static");
                        nodeData.annotations = extractMethodAnnotations(content, methodMatcher.start());

                        functionCalls.putIfAbsent(fullMethodName, new HashSet<>());
                        nodesMap.putIfAbsent(fullMethodName, nodeData);

                        pkg.totalMethods++;

                        String methodBody = extractMethodBody(content, methodMatcher.start());
                        analyzeMethodCalls(fullMethodName, methodBody, imports, currentPackage);
                    }
                }
            }
        } catch (IOException e) {
            System.err.println("Error analyzing file: " + filePath);
            e.printStackTrace();
        }
    }

    private void extractClassMetadata(String content, ClassMetadata classData) {
        // Extract class annotations
        Matcher annotationMatcher = annotationPattern.matcher(content);
        while (annotationMatcher.find()) {
            classData.annotations.add(annotationMatcher.group(1));
        }

        // Extract superclass and interfaces
        Matcher classMatcher = classPattern.matcher(content);
        if (classMatcher.find()) {
            if (classMatcher.group(2) != null) {
                classData.superClass = classMatcher.group(2);
            }
            if (classMatcher.group(3) != null) {
                Arrays.stream(classMatcher.group(3).split(","))
                        .map(String::trim)
                        .forEach(i -> classData.interfaces.add(i));
            }
        }
    }

    private Set<String> extractMethodAnnotations(String content, int methodStart) {
        Set<String> annotations = new HashSet<>();
        int searchStart = Math.max(0, methodStart - 200); // Look back up to 200 chars
        String methodDeclaration = content.substring(searchStart, methodStart);

        Matcher annotationMatcher = annotationPattern.matcher(methodDeclaration);
        while (annotationMatcher.find()) {
            annotations.add(annotationMatcher.group(1));
        }
        return annotations;
    }

    private AccessLevel extractAccessLevel(String methodDeclaration) {
        if (methodDeclaration.contains("public")) return AccessLevel.PUBLIC;
        if (methodDeclaration.contains("protected")) return AccessLevel.PROTECTED;
        if (methodDeclaration.contains("private")) return AccessLevel.PRIVATE;
        return AccessLevel.PACKAGE_PRIVATE;
    }

    private void analyzeMethodCalls(String sourceMethod, String methodBody, Set<String> imports, String currentPackage) {
        Matcher callMatcher = methodCallPattern.matcher(methodBody);
        while (callMatcher.find()) {
            String calledMethod = callMatcher.group(1);
            if (!isJavaBuiltIn(calledMethod) && !isUtilityMethod(calledMethod) && !isBlacklisted(calledMethod)) {
                String resolvedMethod = resolveMethodName(calledMethod, imports, currentPackage);
                if (resolvedMethod != null) {
                    functionCalls.get(sourceMethod).add(resolvedMethod);
                }
            }
        }
    }

    private String resolveMethodName(String methodName, Set<String> imports, String currentPackage) {
        // Check if the method belongs to the current package
        String fullName = currentPackage + "." + methodName;
        if (isProjectPackage(currentPackage)) {
            return fullName;
        }

        // Check if the method belongs to any imported package
        for (String importStatement : imports) {
            if (importStatement.endsWith(".*")) {
                String packageName = importStatement.substring(0, importStatement.length() - 2);
                if (isProjectPackage(packageName)) {
                    return packageName + "." + methodName;
                }
            } else if (importStatement.endsWith("." + methodName) && isProjectPackage(getPackageName(importStatement))) {
                return importStatement;
            }
        }

        return null;
    }

    private boolean isProjectPackage(String packageName) {
        return projectPackages.contains(packageName);
    }

    private String getPackageName(String fullClassName) {
        int lastDot = fullClassName.lastIndexOf('.');
        return lastDot > 0 ? fullClassName.substring(0, lastDot) : fullClassName;
    }

    private Set<String> extractImports(String content) {
        Set<String> imports = new HashSet<>();
        Matcher importMatcher = importPattern.matcher(content);
        while (importMatcher.find()) {
            imports.add(importMatcher.group(1));
        }
        return imports;
    }

    private String extractPackage(String content) {
        Matcher matcher = packagePattern.matcher(content);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String extractClassName(String content) {
        Matcher matcher = actionPattern.matcher(content);
        return matcher.find() ? matcher.group(1) : null;
    }

    private String extractMethodBody(String content, int startIndex) {
        int openBrace = content.indexOf('{', startIndex);
        if (openBrace == -1) return "";

        int closeBrace = findClosingBrace(content, openBrace);
        return closeBrace > openBrace ? content.substring(openBrace + 1, closeBrace) : "";
    }

    private int findClosingBrace(String content, int openBrace) {
        int count = 1;
        int i = openBrace + 1;
        while (i < content.length() && count > 0) {
            char c = content.charAt(i);
            if (c == '{') count++;
            else if (c == '}') count--;
            i++;
        }
        return count == 0 ? i - 1 : -1;
    }

    private boolean isJavaBuiltIn(String methodName) {
        Set<String> builtIns = new HashSet<>(Arrays.asList(
            "toString", "equals", "hashCode", "getClass", "wait", "notify", "notifyAll",
            "println", "print", "format", "append", "substring", "length", "indexOf"
        ));
        return builtIns.contains(methodName);
    }

    private boolean isUtilityMethod(String methodName) {
        return methodName.startsWith("get") || 
               methodName.startsWith("set") || 
               methodName.startsWith("is");
    }

    private String simplifyMethodName(String fullMethodName) {
        String[] parts = fullMethodName.split("\\.");
        if (parts.length >= 2) {
            return parts[parts.length - 2] + "." + parts[parts.length - 1];
        }
        return fullMethodName;
    }

    public String generateNetworkJson() {
        // Create data structures for JSON
        Map<String, NodeData> nodesMap = new HashMap<>();
        // Convert to JSON structure
        StringBuilder json = new StringBuilder();
        json.append("{\n");

        // Add package metadata
        json.append("  \"packages\": [\n");
        Iterator<PackageMetadata> pkgIter = packageMetadata.values().iterator();
        while (pkgIter.hasNext()) {
            PackageMetadata pkg = pkgIter.next();
            json.append("    {\n");
            json.append("      \"name\": \"").append(escapeJson(pkg.name)).append("\",\n");
            json.append("      \"totalMethods\": ").append(pkg.totalMethods).append(",\n");
            json.append("      \"totalClasses\": ").append(pkg.totalClasses).append(",\n");
            json.append("      \"dependencies\": ").append(generateJsonArray(pkg.dependencies)).append(",\n");
            json.append("      \"dependents\": ").append(generateJsonArray(pkg.dependents)).append("\n");
            json.append("    }").append(pkgIter.hasNext() ? "," : "").append("\n");
        }
        json.append("  ],\n");

        // Add class metadata
        json.append("  \"classes\": [\n");
        Iterator<ClassMetadata> classIter = classMetadata.values().iterator();
        while (classIter.hasNext()) {
            ClassMetadata cls = classIter.next();
            json.append("    {\n");
            json.append("      \"name\": \"").append(escapeJson(cls.name)).append("\",\n");
            json.append("      \"packageName\": \"").append(escapeJson(cls.packageName)).append("\",\n");
            json.append("      \"isAction\": ").append(cls.isAction).append(",\n");
            json.append("      \"superClass\": ").append(cls.superClass != null ?
                    "\"" + escapeJson(cls.superClass) + "\"" : "null").append(",\n");
            json.append("      \"interfaces\": ").append(generateJsonArray(cls.interfaces)).append(",\n");
            json.append("      \"annotations\": ").append(generateJsonArray(cls.annotations)).append("\n");
            json.append("    }").append(classIter.hasNext() ? "," : "").append("\n");
        }
        json.append("  ],\n");

        // Add enhanced nodes
        json.append("  \"nodes\": [\n");
        // First ensure all nodes from functionCalls are in nodesMap
        for (Map.Entry<String, Set<String>> entry : functionCalls.entrySet()) {
            String sourceMethod = entry.getKey();
            Set<String> targetMethods = entry.getValue();

            // Ensure source node exists
            if (!nodesMap.containsKey(sourceMethod)) {
                NodeData sourceNode = new NodeData(sourceMethod);
                sourceNode.outgoingCalls = targetMethods.size();
                nodesMap.put(sourceMethod, sourceNode);
            }

            // Ensure target nodes exist and update their stats
            for (String targetMethod : targetMethods) {
                if (!nodesMap.containsKey(targetMethod)) {
                    NodeData targetNode = new NodeData(targetMethod);
                    targetNode.incomingCalls++;
                    targetNode.calledBy.add(sourceMethod);
                    nodesMap.put(targetMethod, targetNode);
                }
            }
        }

        // Now output all nodes
        Iterator<NodeData> nodeIter = nodesMap.values().iterator();
        while (nodeIter.hasNext()) {
            NodeData node = nodeIter.next();
            json.append("    {\n");
            json.append("      \"id\": \"").append(escapeJson(node.id)).append("\",\n");
            json.append("      \"packageName\": \"").append(escapeJson(node.packageName)).append("\",\n");
            json.append("      \"className\": \"").append(escapeJson(node.className)).append("\",\n");
            json.append("      \"methodName\": \"").append(escapeJson(node.methodName)).append("\",\n");
            json.append("      \"isAction\": ").append(node.isAction).append(",\n");
            json.append("      \"accessLevel\": \"").append(node.accessLevel).append("\",\n");
            json.append("      \"isStatic\": ").append(node.isStatic).append(",\n");
            json.append("      \"statistics\": {\n");
            json.append("        \"incomingCalls\": ").append(node.incomingCalls).append(",\n");
            json.append("        \"outgoingCalls\": ").append(node.outgoingCalls).append(",\n");
            json.append("        \"calledBy\": ").append(generateJsonArray(node.calledBy)).append(",\n");
            json.append("        \"calls\": ").append(generateJsonArray(node.calls)).append("\n");
            json.append("      },\n");
            json.append("      \"annotations\": ").append(generateJsonArray(node.annotations)).append("\n");
            json.append("    }").append(nodeIter.hasNext() ? "," : "").append("\n");
        }
        json.append("  ],\n");

        // Generate links
        json.append("  \"links\": [\n");
        List<Map<String, String>> links = new ArrayList<>();
        for (Map.Entry<String, Set<String>> entry : functionCalls.entrySet()) {
            String source = entry.getKey();
            for (String target : entry.getValue()) {
                Map<String, String> link = new HashMap<>();
                link.put("source", source);
                link.put("target", target);
                links.add(link);
            }
        }

        // Output links
        for (int i = 0; i < links.size(); i++) {
            Map<String, String> link = links.get(i);
            json.append("    {\n");
            json.append("      \"source\": \"").append(escapeJson(link.get("source"))).append("\",\n");
            json.append("      \"target\": \"").append(escapeJson(link.get("target"))).append("\"\n");
            json.append("    }").append(i < links.size() - 1 ? "," : "").append("\n");
        }
        json.append("  ]\n}");

        return json.toString();
    }
    private String generateJsonArray(Set<String> items) {
        if (items == null || items.isEmpty()) {
            return "[]";
        }
        return items.stream()
                .map(item -> "\"" + escapeJson(item) + "\"")
                .collect(Collectors.joining(", ", "[", "]"));
    }

    
    private String escapeJson(String text) {
        return text.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }
    
    // Inner class to hold node data
    private static class NodeData {
        String id;
        String packageName;
        String className;
        String methodName;
        int incomingCalls = 0;
        int outgoingCalls = 0;
        Set<String> calledBy = new HashSet<>();
        Set<String> calls = new HashSet<>();
        boolean isAction;
        AccessLevel accessLevel;
        boolean isStatic;
        Set<String> annotations = new HashSet<>();
        
        NodeData(String id) {
            this.id = id;
            parseIdentifiers();
        }
        
        private void parseIdentifiers() {
            String[] parts = id.split("\\.");
            if (parts.length >= 2) {
                methodName = parts[parts.length - 1];
                className = parts[parts.length - 2];
                packageName = String.join(".", Arrays.copyOfRange(parts, 0, parts.length - 2));
            }
        }
    }

    // New class to track package-level metadata
    private static class PackageMetadata {
        String name;
        int totalMethods = 0;
        int totalClasses = 0;
        Set<String> dependencies = new HashSet<>();
        Set<String> dependents = new HashSet<>();

        PackageMetadata(String name) {
            this.name = name;
        }
    }
    private enum AccessLevel {
        PUBLIC, PROTECTED, PRIVATE, PACKAGE_PRIVATE
    }
    // New class to track class-level metadata
    private static class ClassMetadata {
        String name;
        String packageName;
        boolean isAction;
        Set<String> interfaces = new HashSet<>();
        String superClass;
        Set<String> annotations = new HashSet<>();

        ClassMetadata(String name, String packageName) {
            this.name = name;
            this.packageName = packageName;
        }
    }

    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("Usage: java StrutsFunctionAnalyzer <directory_path> [blacklist_file]");
            return;
        }

        StrutsFunctionAnalyzer analyzer = new StrutsFunctionAnalyzer();
        try {
            // Load blacklist if provided
            if (args.length > 1) {
                analyzer.loadBlacklist(args[1]);
                System.out.println("Loaded blacklist from: " + args[1]);
            }

            // Analyze the directory
            analyzer.analyzeDirectory(args[0]);
            
            // Generate and save network JSON
            String networkJson = analyzer.generateNetworkJson();
            Path jsonOutputPath = Paths.get("../frontend/public/function_network.json");
            Files.write(jsonOutputPath, networkJson.getBytes());
            System.out.println("Network JSON has been written to: " + jsonOutputPath.toAbsolutePath());
            
        } catch (IOException e) {
            System.err.println("Error analyzing directory: " + args[0]);
            e.printStackTrace();
        }
    }
}