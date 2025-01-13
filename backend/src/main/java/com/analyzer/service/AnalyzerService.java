package com.analyzer.service;

import com.analyzer.StrutsFunctionAnalyzer;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import java.io.IOException;
import java.util.Set;

@Service
public class AnalyzerService {
    private final BlacklistService blacklistService;
    private StrutsFunctionAnalyzer analyzer;

    @Autowired
    public AnalyzerService(BlacklistService blacklistService) {
        this.blacklistService = blacklistService;
        this.analyzer = new StrutsFunctionAnalyzer();
    }

    // Setter for testing purposes
    void setAnalyzer(StrutsFunctionAnalyzer analyzer) {
        this.analyzer = analyzer;
    }

    public String analyzeDirectory(String path) throws IOException {
        try {
            // Retrieve the current blacklist
            Set<String> blacklist = blacklistService.getBlacklist();

            // Set the blacklist in the analyzer
            analyzer.setBlacklist(blacklist);

            // Perform directory analysis
            analyzer.analyzeDirectory(path);

            // Generate network JSON
            return analyzer.generateNetworkJson();
        } catch (IOException e) {
            throw new IOException("Failed to analyze directory: " + e.getMessage(), e);
        }
    }
}