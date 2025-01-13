package com.analyzer.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class BlacklistServiceTest {

    private BlacklistService blacklistService;

    @BeforeEach
    void setUp() {
        blacklistService = new BlacklistService();
    }

    @Test
    void testUpdateBlacklist() {
        // Arrange
        Set<String> methodNames = new HashSet<>();
        methodNames.add("method1");
        methodNames.add("method2");

        // Act
        blacklistService.updateBlacklist(methodNames);

        // Assert
        Set<String> retrievedBlacklist = blacklistService.getBlacklist();
        assertEquals(2, retrievedBlacklist.size());
        assertTrue(retrievedBlacklist.contains("method1"));
        assertTrue(retrievedBlacklist.contains("method2"));
    }

    @Test
    void testUpdateBlacklistClearsExistingEntries() {
        // Arrange
        Set<String> initialMethodNames = new HashSet<>();
        initialMethodNames.add("oldMethod");
        blacklistService.updateBlacklist(initialMethodNames);

        Set<String> newMethodNames = new HashSet<>();
        newMethodNames.add("newMethod1");
        newMethodNames.add("newMethod2");

        // Act
        blacklistService.updateBlacklist(newMethodNames);

        // Assert
        Set<String> retrievedBlacklist = blacklistService.getBlacklist();
        assertEquals(2, retrievedBlacklist.size());
        assertFalse(retrievedBlacklist.contains("oldMethod"));
        assertTrue(retrievedBlacklist.contains("newMethod1"));
        assertTrue(retrievedBlacklist.contains("newMethod2"));
    }

    @Test
    void testGetBlacklistReturnsNewInstance() {
        // Arrange
        Set<String> methodNames = new HashSet<>();
        methodNames.add("method1");
        blacklistService.updateBlacklist(methodNames);

        // Act
        Set<String> firstRetrieval = blacklistService.getBlacklist();
        Set<String> secondRetrieval = blacklistService.getBlacklist();

        // Assert
        assertNotSame(firstRetrieval, secondRetrieval);
        assertEquals(firstRetrieval, secondRetrieval);
    }
}