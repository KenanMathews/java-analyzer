package com.analyzer.dto;

import java.util.Set;

public class BlacklistRequest {
    private Set<String> methodNames;

    public Set<String> getMethodNames() {
        return methodNames;
    }

    public void setMethodNames(Set<String> methodNames) {
        this.methodNames = methodNames;
    }
}