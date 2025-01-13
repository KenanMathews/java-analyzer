package com.analyzer.service;

import org.springframework.stereotype.Service;
import java.util.HashSet;
import java.util.Set;

@Service
public class BlacklistService {
    private Set<String> blacklistedMethods = new HashSet<>();

    public void updateBlacklist(Set<String> methodNames) {
        blacklistedMethods.clear();
        blacklistedMethods.addAll(methodNames);
    }

    public Set<String> getBlacklist() {
        return new HashSet<>(blacklistedMethods);
    }
}