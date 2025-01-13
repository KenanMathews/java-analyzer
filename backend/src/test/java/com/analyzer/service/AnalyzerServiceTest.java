package com.analyzer.service;

import com.analyzer.StrutsFunctionAnalyzer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyzerServiceTest {

    @Mock
    private BlacklistService blacklistService;

    @Mock
    private StrutsFunctionAnalyzer mockAnalyzer;

    private AnalyzerService analyzerService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        analyzerService = new AnalyzerService(blacklistService);
        analyzerService.setAnalyzer(mockAnalyzer);
    }

    @Test
    void testAnalyzeDirectory_Successful() throws IOException {
        // Arrange
        String testPath = "/test/directory";
        Set<String> testBlacklist = new HashSet<>();
        testBlacklist.add("forbiddenMethod");

        // Stub the blacklist service to return test blacklist
        when(blacklistService.getBlacklist()).thenReturn(testBlacklist);

        // Stub the analyzer methods
        doNothing().when(mockAnalyzer).setBlacklist(testBlacklist);
        doNothing().when(mockAnalyzer).analyzeDirectory(testPath);
        when(mockAnalyzer.generateNetworkJson()).thenReturn("{\"test\":\"json\"}");

        // Act
        String result = analyzerService.analyzeDirectory(testPath);

        // Assert
        assertNotNull(result);
        assertEquals("{\"test\":\"json\"}", result);
        
        // Verify interactions
        verify(blacklistService).getBlacklist();
        verify(mockAnalyzer).setBlacklist(testBlacklist);
        verify(mockAnalyzer).analyzeDirectory(testPath);
        verify(mockAnalyzer).generateNetworkJson();
    }

    @Test
    void testAnalyzeDirectory_IOException() throws IOException {
        // Arrange
        String testPath = "/test/directory";
        Set<String> testBlacklist = new HashSet<>();
        
        // Stub the blacklist service to return test blacklist
        when(blacklistService.getBlacklist()).thenReturn(testBlacklist);

        // Stub the analyzer to throw IOException
        doNothing().when(mockAnalyzer).setBlacklist(testBlacklist);
        doThrow(new IOException("Test IO Exception")).when(mockAnalyzer).analyzeDirectory(testPath);

        // Act & Assert
        IOException thrown = assertThrows(IOException.class, () -> {
            analyzerService.analyzeDirectory(testPath);
        });

        // Verify the exception message
        assertTrue(thrown.getMessage().contains("Failed to analyze directory: Test IO Exception"));
        
        // Verify interactions
        verify(blacklistService).getBlacklist();
        verify(mockAnalyzer).setBlacklist(testBlacklist);
        verify(mockAnalyzer).analyzeDirectory(testPath);
    }
}