# How to Use Dapr Secrets Management with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Node.js, Security, Microservice

Description: Learn how to retrieve and use secrets in Node.js applications with the Dapr Secrets Management API across Kubernetes, Vault, and other stores.

---

## Introduction

Dapr's Secrets Management API provides a uniform interface for retrieving secrets from different backends without changing application code. Node.js services can fetch secrets from Kubernetes secrets, HashiCorp Vault, AWS Secrets Manager, and more through the same SDK call.

## Installing the SDK

```bash
npm install @dapr/dapr
```

## Configuring Secret Store Components

For Kubernetes:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kubernetes-secrets
spec:
  type: secretstores.kubernetes
  version: v1
```

For HashiCorp Vault:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: http://vault:8200
    - name: vaultToken
      value: s.mytoken
```

## Getting a Single Secret

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
});

async function getDbPassword() {
  const secret = await client.secret.get("kubernetes-secrets", "db-password");
  return secret["db-password"];
}
```

## Getting a Multi-Value Secret

```javascript
async function getDatabaseCredentials() {
  const secrets = await client.secret.get("vault-secrets", "database/prod");
  return {
    host: secrets.host,
    username: secrets.username,
    password: secrets.password,
    port: secrets.port,
  };
}
```

## Getting All Secrets in Bulk

```javascript
async function loadAllSecrets() {
  const allSecrets = await client.secret.getBulk("kubernetes-secrets");
  console.log("Available secrets:", Object.keys(allSecrets));
  return allSecrets;
}
```

## Using Secrets at Application Startup

Load secrets once during startup and cache them:

```javascript
const secrets = {};

async function initSecrets() {
  const dbCreds = await client.secret.get("kubernetes-secrets", "db-credentials");
  secrets.dbUrl = `postgresql://${dbCreds.username}:${dbCreds.password}@${dbCreds.host}:5432/mydb`;

  const apiSecret = await client.secret.get("kubernetes-secrets", "api-key");
  secrets.apiKey = apiSecret["api-key"];

  console.log("Secrets loaded successfully");
}

async function main() {
  await initSecrets();
  // Use secrets.dbUrl and secrets.apiKey in your app
  await startServer(secrets);
}
```

## Passing Metadata for Store-Specific Options

```javascript
// Vault: specify a secret version
const secret = await client.secret.get(
  "vault-secrets",
  "my-secret",
  "metadata.version_id=2"
);
```

## Avoiding Secret Leaks in Logs

Never log secret values:

```javascript
async function loadApiKey() {
  const secret = await client.secret.get("kubernetes-secrets", "api-key");
  const key = secret["api-key"];
  console.log("API key loaded:", key.substring(0, 4) + "****");
  return key;
}
```

## Summary

Dapr Secrets Management in Node.js provides a clean, provider-agnostic API for loading secrets at startup or on demand. By fetching secrets through Dapr rather than environment variables or config files, you reduce secret exposure and gain the flexibility to switch secret store backends without code changes.
