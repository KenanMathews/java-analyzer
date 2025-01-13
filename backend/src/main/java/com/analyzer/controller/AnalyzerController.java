package com.analyzer.controller;

import com.analyzer.service.AnalyzerService;
import com.analyzer.service.BlacklistService;
import com.analyzer.dto.BlacklistRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.Set;

@RestController
@RequestMapping("/api")
public class AnalyzerController {
    private final AnalyzerService analyzerService;
    private final BlacklistService blacklistService;

    @Autowired
    public AnalyzerController(AnalyzerService analyzerService, BlacklistService blacklistService) {
        this.analyzerService = analyzerService;
        this.blacklistService = blacklistService;
    }

    @PostMapping("/analyze")
    public ResponseEntity<String> analyzeDirectory(@RequestParam("path") String path) {
        try {
            String result = analyzerService.analyzeDirectory(path);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/blacklist")
    public ResponseEntity<Void> updateBlacklist(@RequestBody BlacklistRequest request) {
        blacklistService.updateBlacklist(request.getMethodNames());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/blacklist")
    public ResponseEntity<Set<String>> getBlacklist() {
        return ResponseEntity.ok(blacklistService.getBlacklist());
    }
}