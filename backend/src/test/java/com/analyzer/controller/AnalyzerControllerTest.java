package com.analyzer.controller;

import com.analyzer.service.AnalyzerService;
import com.analyzer.service.BlacklistService;
import com.analyzer.dto.BlacklistRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.io.IOException;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AnalyzerControllerTest {

    @Mock
    private AnalyzerService analyzerService;

    @Mock
    private BlacklistService blacklistService;

    @InjectMocks
    private AnalyzerController analyzerController;

    @Test
    void testAnalyzeDirectory_Successful() throws IOException {
        // Arrange
        String testPath = "/test/directory";
        String expectedResult = "{\"test\":\"json\"}";
        
        when(analyzerService.analyzeDirectory(testPath)).thenReturn(expectedResult);

        // Act
        ResponseEntity<String> response = analyzerController.analyzeDirectory(testPath);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(expectedResult, response.getBody());

        // Verify
        verify(analyzerService).analyzeDirectory(testPath);
    }

    @Test
    void testAnalyzeDirectory_IOException() throws IOException {
        // Arrange
        String testPath = "/test/directory";
        
        when(analyzerService.analyzeDirectory(testPath)).thenThrow(new IOException("Test IO Exception"));

        // Act
        ResponseEntity<String> response = analyzerController.analyzeDirectory(testPath);

        // Assert
        assertNotNull(response);
        assertEquals(500, response.getStatusCode().value());
        assertTrue(response.getBody().contains("Error: Test IO Exception"));

        // Verify
        verify(analyzerService).analyzeDirectory(testPath);
    }

    @Test
    void testUpdateBlacklist() {
        // Arrange
        BlacklistRequest request = new BlacklistRequest();
        Set<String> methodNames = new HashSet<>();
        methodNames.add("method1");
        methodNames.add("method2");
        request.setMethodNames(methodNames);

        // Act
        ResponseEntity<Void> response = analyzerController.updateBlacklist(request);

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertNull(response.getBody());

        // Verify
        verify(blacklistService).updateBlacklist(methodNames);
    }

    @Test
    void testGetBlacklist() {
        // Arrange
        Set<String> blacklist = new HashSet<>();
        blacklist.add("method1");
        blacklist.add("method2");
        
        when(blacklistService.getBlacklist()).thenReturn(blacklist);

        // Act
        ResponseEntity<Set<String>> response = analyzerController.getBlacklist();

        // Assert
        assertNotNull(response);
        assertEquals(200, response.getStatusCode().value());
        assertEquals(blacklist, response.getBody());

        // Verify
        verify(blacklistService).getBlacklist();
    }
}