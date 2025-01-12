package com.analyzer;

public class Main {
    public static void main(String[] args) {
        if (args.length < 1) {
            System.err.println("Usage: java -jar analyzer.jar <struts-project-directory>");
            System.exit(1);
        }

        String projectDir = args[0];
        StrutsFunctionAnalyzer analyzer = new StrutsFunctionAnalyzer();
        
        try {
            analyzer.analyzeDirectory(projectDir);
            String mermaidDiagram = analyzer.generateNetworkJson();
            System.out.println(mermaidDiagram);
        } catch (Exception e) {
            System.err.println("Error analyzing directory: " + projectDir);
            e.printStackTrace();
            System.exit(1);
        }
    }
}