# How to Use Dapr Cryptography with .NET SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, .NET, Cryptography, Encryption, C#

Description: Encrypt and decrypt data in .NET applications using the Dapr Cryptography API with local keys and Azure Key Vault, without managing cryptographic libraries directly.

---

## Overview

The Dapr Cryptography API abstracts encryption and decryption operations behind a component-based model. Your .NET code calls the API without knowing whether keys are stored locally, in Azure Key Vault, or another provider.

## Prerequisites

```bash
dotnet add package Dapr.Client
```

Configure a cryptography component:

```yaml
# local-crypto.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-crypto
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      value: /tmp/crypto-keys
```

## Step 1: Generate a Key

Generate an RSA key for use with Dapr:

```bash
# Generate RSA private key
openssl genpkey -algorithm RSA -out /tmp/crypto-keys/mykey.pem -pkeyopt rsa_keygen_bits:4096
openssl rsa -pubout -in /tmp/crypto-keys/mykey.pem -out /tmp/crypto-keys/mykey.pub.pem
```

## Step 2: Encrypt Data

```csharp
using Dapr.Client;
using System.IO;

public class CryptoService
{
    private readonly DaprClient _dapr;
    private const string ComponentName = "local-crypto";

    public CryptoService(DaprClient dapr) => _dapr = dapr;

    public async Task<byte[]> EncryptAsync(string plaintext)
    {
        var plaintextStream = new MemoryStream(System.Text.Encoding.UTF8.GetBytes(plaintext));

        using var ms = new MemoryStream();
        await foreach (var chunk in _dapr.EncryptAsync(
            ComponentName,
            plaintextStream,
            "mykey",
            new EncryptionOptions(KeyWrapAlgorithm.Rsa)
            {
                EncryptionCipher = DataEncryptionCipher.AesGcm
            }))
        {
            ms.Write(chunk.Span);
        }
        return ms.ToArray();
    }
}
```

## Step 3: Decrypt Data

```csharp
public async Task<string> DecryptAsync(byte[] ciphertext)
{
    var encryptedStream = new MemoryStream(ciphertext);

    using var ms = new MemoryStream();
    await foreach (var chunk in _dapr.DecryptAsync(
        ComponentName,
        encryptedStream,
        "mykey"))
    {
        ms.Write(chunk.Span);
    }
    return System.Text.Encoding.UTF8.GetString(ms.ToArray());
}
```

## Step 4: Encrypt Files

```csharp
public async Task EncryptFileAsync(string inputPath, string outputPath)
{
    using var inputFile = File.OpenRead(inputPath);
    using var outputFile = File.Create(outputPath);

    await foreach (var chunk in _dapr.EncryptAsync(
        ComponentName,
        inputFile,
        "mykey",
        new EncryptionOptions(KeyWrapAlgorithm.Rsa)))
    {
        outputFile.Write(chunk.Span);
    }
    Console.WriteLine($"Encrypted: {inputPath} -> {outputPath}");
}

public async Task DecryptFileAsync(string inputPath, string outputPath)
{
    using var inputFile = File.OpenRead(inputPath);
    using var outputFile = File.Create(outputPath);

    await foreach (var chunk in _dapr.DecryptAsync(
        ComponentName,
        inputFile,
        "mykey"))
    {
        outputFile.Write(chunk.Span);
    }
    Console.WriteLine($"Decrypted: {inputPath} -> {outputPath}");
}
```

## Step 5: Use Azure Key Vault Component

Switch to Azure Key Vault by changing the component - no code changes needed:

```yaml
# akv-crypto.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-crypto  # Same name - app code unchanged
spec:
  type: crypto.azure.keyvault
  version: v1
  metadata:
    - name: vaultName
      value: "mykeyvault"
    - name: azureClientId
      value: "<managed-identity-client-id>"
```

## Summary

The Dapr Cryptography API in .NET provides stream-based encrypt and decrypt operations through `DaprClient.EncryptAsync` and `DecryptAsync`. Key management is delegated to the configured component - whether local files, Azure Key Vault, or another provider. Switching key providers requires only a component YAML change, with no modification to application code.
