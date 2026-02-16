# How to Implement Azure Key Vault Certificate Management in a Node.js Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Key Vault, Certificates, Node.js, Security, TLS, SDK, Cloud

Description: Manage TLS certificates programmatically using Azure Key Vault in a Node.js application with automatic renewal, rotation, and monitoring.

---

Certificate management is one of those things that feels simple until it is not. You create a certificate, install it, everything works for a year, and then it expires at 3 AM on a Sunday and your service goes down. Azure Key Vault takes the pain out of certificate management by providing a centralized store for certificates with automatic renewal, access policies, and audit logging.

In this post, we will use the Azure Key Vault Certificates SDK in Node.js to create, import, retrieve, and monitor certificates. We will also set up automatic renewal and build alerting for certificates that are about to expire.

## Why Key Vault for Certificates

Managing certificates across multiple services is error-prone. Certificates get stored in config files, passed around in emails, or forgotten on someone's laptop. Key Vault solves this by:

- Centralizing certificate storage with access control
- Supporting automatic renewal with integrated Certificate Authorities
- Providing version history so you can roll back
- Offering soft delete to recover accidentally deleted certificates
- Integrating with Azure services like App Service, API Management, and Application Gateway

## Setup

```bash
# Install the Azure Key Vault certificates SDK
npm install @azure/keyvault-certificates @azure/identity

# Install the secrets SDK too - we will need it to get the private key
npm install @azure/keyvault-secrets
```

## Create a Key Vault

```bash
# Create a Key Vault
az keyvault create \
  --name my-cert-vault \
  --resource-group cert-rg \
  --location eastus \
  --enable-soft-delete true \
  --retention-days 90

# Grant yourself certificate management permissions
az keyvault set-policy \
  --name my-cert-vault \
  --upn your@email.com \
  --certificate-permissions get list create delete update import backup restore recover purge
```

## Initialize the Client

```javascript
// src/cert-client.js
// Initialize Azure Key Vault certificate client
const { CertificateClient, WellKnownIssuer } = require('@azure/keyvault-certificates');
const { SecretClient } = require('@azure/keyvault-secrets');
const { DefaultAzureCredential } = require('@azure/identity');

const vaultUrl = process.env.KEYVAULT_URL || 'https://my-cert-vault.vault.azure.net';
const credential = new DefaultAzureCredential();

// Certificate client for managing certificates
const certClient = new CertificateClient(vaultUrl, credential);

// Secret client for retrieving the private key portion of certificates
const secretClient = new SecretClient(vaultUrl, credential);

module.exports = { certClient, secretClient };
```

## Create a Self-Signed Certificate

Self-signed certificates are useful for development and internal services.

```javascript
// src/operations/create-cert.js
// Create certificates in Azure Key Vault
const { certClient } = require('../cert-client');
const { WellKnownIssuer } = require('@azure/keyvault-certificates');

async function createSelfSignedCert(name, subject, validityMonths = 12) {
  /**
   * Create a self-signed certificate in Key Vault.
   * The vault generates the key pair and signs the certificate.
   */
  console.log(`Creating self-signed certificate: ${name}`);

  const poller = await certClient.beginCreateCertificate(name, {
    issuerName: WellKnownIssuer.Self,  // Self-signed
    subject: subject,                    // e.g., 'CN=myservice.example.com'
    validityInMonths: validityMonths,

    // Key properties
    keyType: 'RSA',
    keySize: 2048,
    reuseKey: false,  // Generate a new key on renewal

    // Usage
    keyUsage: ['digitalSignature', 'keyEncipherment'],
    enhancedKeyUsage: ['1.3.6.1.5.5.7.3.1'],  // Server authentication OID

    // Lifecycle actions - auto-renew 30 days before expiry
    lifetimeActions: [
      {
        action: 'AutoRenew',
        daysBeforeExpiry: 30,
      },
    ],

    // Content type - PEM or PKCS12
    contentType: 'application/x-pem-file',

    // Subject Alternative Names for additional domains
    subjectAlternativeNames: {
      dnsNames: [
        'myservice.example.com',
        '*.myservice.example.com',
      ],
    },
  });

  // Wait for the certificate to be created
  const certificate = await poller.pollUntilDone();

  console.log(`Certificate created: ${certificate.name}`);
  console.log(`  Thumbprint: ${certificate.properties.x509Thumbprint}`);
  console.log(`  Not before: ${certificate.properties.notBefore}`);
  console.log(`  Expires on: ${certificate.properties.expiresOn}`);

  return certificate;
}

async function createCACert(name, subject, issuerName) {
  /**
   * Create a certificate signed by a Certificate Authority.
   * The CA must be configured in Key Vault first.
   * Supported CAs: DigiCert, GlobalSign
   */
  const poller = await certClient.beginCreateCertificate(name, {
    issuerName: issuerName,  // Name of the CA configured in Key Vault
    subject: subject,
    validityInMonths: 12,
    keyType: 'RSA',
    keySize: 2048,
    contentType: 'application/x-pkcs12',

    lifetimeActions: [
      {
        // Email notification 60 days before expiry
        action: 'EmailContacts',
        daysBeforeExpiry: 60,
      },
      {
        // Auto-renew 30 days before expiry
        action: 'AutoRenew',
        daysBeforeExpiry: 30,
      },
    ],
  });

  return await poller.pollUntilDone();
}

module.exports = { createSelfSignedCert, createCACert };
```

## Import an Existing Certificate

```javascript
// src/operations/import-cert.js
// Import an existing certificate into Key Vault
const { certClient } = require('../cert-client');
const fs = require('fs');

async function importPemCertificate(name, certPath, keyPath) {
  /**
   * Import a PEM certificate with its private key into Key Vault.
   */
  const certPem = fs.readFileSync(certPath, 'utf8');
  const keyPem = fs.readFileSync(keyPath, 'utf8');

  // Combine cert and key into a single PEM
  const combined = certPem + '\n' + keyPem;

  const certificate = await certClient.importCertificate(name, Buffer.from(combined), {
    policy: {
      issuerName: 'Unknown',  // External issuer
      contentType: 'application/x-pem-file',
      keyType: 'RSA',
    },
  });

  console.log(`Imported certificate: ${certificate.name}`);
  console.log(`  Version: ${certificate.properties.version}`);
  return certificate;
}

async function importPfxCertificate(name, pfxPath, password) {
  /**
   * Import a PFX/PKCS12 certificate into Key Vault.
   */
  const pfxBuffer = fs.readFileSync(pfxPath);

  const certificate = await certClient.importCertificate(name, pfxBuffer, {
    password: password,
    policy: {
      issuerName: 'Unknown',
      contentType: 'application/x-pkcs12',
    },
  });

  console.log(`Imported PFX certificate: ${certificate.name}`);
  return certificate;
}

module.exports = { importPemCertificate, importPfxCertificate };
```

## Retrieve a Certificate and Its Private Key

Getting the certificate is straightforward, but getting the private key requires the Secrets SDK because Key Vault stores the full certificate (including private key) as a secret.

```javascript
// src/operations/get-cert.js
// Retrieve certificates and their private keys from Key Vault
const { certClient, secretClient } = require('../cert-client');

async function getCertificate(name) {
  /**
   * Get the public certificate (without private key).
   */
  const cert = await certClient.getCertificate(name);

  return {
    name: cert.name,
    version: cert.properties.version,
    thumbprint: cert.properties.x509Thumbprint,
    notBefore: cert.properties.notBefore,
    expiresOn: cert.properties.expiresOn,
    // The CER (public portion) is in the cer property
    publicCertificate: cert.cer,
  };
}

async function getCertificateWithPrivateKey(name) {
  /**
   * Get the full certificate including the private key.
   * Key Vault stores the full cert as a secret with the same name.
   */
  // Get the public certificate info
  const cert = await certClient.getCertificate(name);

  // Get the private key from the secrets store
  const secret = await secretClient.getSecret(name);

  if (cert.policy && cert.policy.contentType === 'application/x-pem-file') {
    // PEM format - the secret value is the PEM-encoded cert + key
    return {
      name: cert.name,
      certificate: secret.value,  // Full PEM (cert + key)
      contentType: 'pem',
    };
  } else {
    // PKCS12 format - the secret value is base64-encoded PFX
    return {
      name: cert.name,
      certificate: Buffer.from(secret.value, 'base64'),
      contentType: 'pkcs12',
    };
  }
}

async function useCertForHttps(name) {
  /**
   * Example: Use a Key Vault certificate for an HTTPS server.
   */
  const https = require('https');
  const certData = await getCertificateWithPrivateKey(name);

  if (certData.contentType === 'pem') {
    // Split PEM into cert and key
    const parts = certData.certificate.split('-----BEGIN RSA PRIVATE KEY-----');
    const cert = parts[0];
    const key = '-----BEGIN RSA PRIVATE KEY-----' + parts[1];

    const server = https.createServer({ cert, key }, (req, res) => {
      res.writeHead(200);
      res.end('Hello, secure world!');
    });

    server.listen(443, () => console.log('HTTPS server running on port 443'));
    return server;
  }
}

module.exports = { getCertificate, getCertificateWithPrivateKey, useCertForHttps };
```

## Monitor Certificate Expiration

Build a monitoring function that checks all certificates and alerts on upcoming expirations.

```javascript
// src/operations/monitor.js
// Monitor certificate expiration dates
const { certClient } = require('../cert-client');

async function checkExpiringCertificates(warningDays = 30, criticalDays = 7) {
  /**
   * Check all certificates in the vault for upcoming expirations.
   * Returns categorized results.
   */
  const now = new Date();
  const results = {
    critical: [],   // Expiring within criticalDays
    warning: [],    // Expiring within warningDays
    healthy: [],    // Not expiring soon
    expired: [],    // Already expired
  };

  // List all certificates in the vault
  for await (const certProperties of certClient.listPropertiesOfCertificates()) {
    const expiresOn = certProperties.expiresOn;
    const name = certProperties.name;

    if (!expiresOn) {
      continue;
    }

    const daysUntilExpiry = Math.floor(
      (expiresOn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const certInfo = {
      name,
      expiresOn: expiresOn.toISOString(),
      daysUntilExpiry,
      enabled: certProperties.enabled,
    };

    if (daysUntilExpiry < 0) {
      results.expired.push(certInfo);
    } else if (daysUntilExpiry <= criticalDays) {
      results.critical.push(certInfo);
    } else if (daysUntilExpiry <= warningDays) {
      results.warning.push(certInfo);
    } else {
      results.healthy.push(certInfo);
    }
  }

  // Log the summary
  console.log(`Certificate health check:`);
  console.log(`  Expired: ${results.expired.length}`);
  console.log(`  Critical (< ${criticalDays} days): ${results.critical.length}`);
  console.log(`  Warning (< ${warningDays} days): ${results.warning.length}`);
  console.log(`  Healthy: ${results.healthy.length}`);

  // Print details for expired and critical certificates
  for (const cert of [...results.expired, ...results.critical]) {
    console.log(`  ALERT: ${cert.name} - ${cert.daysUntilExpiry < 0 ? 'EXPIRED' : cert.daysUntilExpiry + ' days remaining'}`);
  }

  return results;
}

async function getCertificateVersionHistory(name) {
  /**
   * List all versions of a certificate.
   * Useful for auditing rotation history.
   */
  const versions = [];

  for await (const version of certClient.listPropertiesOfCertificateVersions(name)) {
    versions.push({
      version: version.version,
      createdOn: version.createdOn,
      expiresOn: version.expiresOn,
      enabled: version.enabled,
    });
  }

  // Sort by creation date descending
  versions.sort((a, b) => b.createdOn - a.createdOn);

  console.log(`Certificate ${name} has ${versions.length} versions:`);
  for (const v of versions) {
    console.log(`  Version: ${v.version}, Created: ${v.createdOn?.toISOString()}, Expires: ${v.expiresOn?.toISOString()}, Enabled: ${v.enabled}`);
  }

  return versions;
}

module.exports = { checkExpiringCertificates, getCertificateVersionHistory };
```

## Express.js API for Certificate Management

```javascript
// src/api.js
// REST API for certificate management
const express = require('express');
const { createSelfSignedCert } = require('./operations/create-cert');
const { getCertificate } = require('./operations/get-cert');
const { checkExpiringCertificates } = require('./operations/monitor');

const app = express();
app.use(express.json());

// List all certificates with their status
app.get('/api/certificates', async (req, res) => {
  const results = await checkExpiringCertificates();
  res.json(results);
});

// Get a specific certificate
app.get('/api/certificates/:name', async (req, res) => {
  try {
    const cert = await getCertificate(req.params.name);
    res.json(cert);
  } catch (err) {
    if (err.code === 'CertificateNotFound') {
      return res.status(404).json({ error: 'Certificate not found' });
    }
    throw err;
  }
});

// Create a new self-signed certificate
app.post('/api/certificates', async (req, res) => {
  const { name, subject, validityMonths } = req.body;
  const cert = await createSelfSignedCert(name, subject, validityMonths);
  res.status(201).json({
    name: cert.name,
    expiresOn: cert.properties.expiresOn,
  });
});

// Health check that includes certificate expiration status
app.get('/health', async (req, res) => {
  const results = await checkExpiringCertificates();
  const status = results.expired.length > 0 || results.critical.length > 0
    ? 'degraded'
    : 'healthy';

  res.json({
    status,
    expiredCerts: results.expired.length,
    criticalCerts: results.critical.length,
  });
});

app.listen(3000, () => console.log('Certificate management API running on port 3000'));
```

## Automated Rotation

If you use self-signed certificates or certificates from an integrated CA, Key Vault can rotate them automatically. For externally issued certificates, you can build a rotation function that runs on a schedule.

```javascript
// Scheduled rotation check - run this as a cron job or Azure Function timer
async function rotateExpiringCerts() {
  const results = await checkExpiringCertificates(60, 14);

  for (const cert of results.warning) {
    console.log(`Initiating renewal for ${cert.name}`);
    // If using an integrated CA, this triggers a renewal request
    // If self-signed, this creates a new version
    const poller = await certClient.beginCreateCertificate(cert.name, {
      // The existing policy is reused
    });
    await poller.pollUntilDone();
    console.log(`Renewed certificate: ${cert.name}`);
  }
}
```

## Summary

Azure Key Vault provides a centralized, secure place to manage certificates with automatic renewal, version tracking, and access control. The Node.js SDK gives you programmatic access to create, import, retrieve, and monitor certificates. The most important practices are: enable auto-renewal for certificates managed by Key Vault, monitor expiration dates proactively, use separate access policies for different services (principle of least privilege), and keep the private key retrieval path separate from the certificate metadata path for better security segmentation.
