# How to Manage Secrets with HashiCorp Vault in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, Spring Boot, HashiCorp Vault, Secrets Management, Security, Configuration, DevOps, Cloud Native

Description: Learn how to securely manage secrets in Spring Boot applications using HashiCorp Vault. This guide covers Vault integration, dynamic credentials, secret rotation, and best practices for production deployments.

---

> Hardcoded secrets in configuration files are a security incident waiting to happen. HashiCorp Vault provides centralized secrets management with access control, audit logging, and automatic credential rotation. Spring Cloud Vault makes integration straightforward for Spring Boot applications.

Stop storing secrets in plain text. Vault keeps your credentials secure and your audit trail clean.

---

## Overview

```mermaid
flowchart LR
    App["Spring Boot<br/>Application"] --> Vault["HashiCorp<br/>Vault"]
    Vault --> KV["KV Secrets<br/>(API Keys)"]
    Vault --> DB["Database<br/>Credentials"]
    Vault --> PKI["PKI<br/>(Certificates)"]
    Vault --> Transit["Transit<br/>(Encryption)"]
```

---

## Prerequisites

Start a development Vault server for testing:

```bash
# Start Vault in development mode (not for production)
vault server -dev -dev-root-token-id="root-token"

# In another terminal, set the address and token
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root-token'

# Verify Vault is running
vault status
```

---

## Dependencies

Add Spring Cloud Vault to your project:

```xml
<!-- pom.xml -->
<dependencyManagement>
    <dependencies>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>2023.0.0</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-vault-config</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

---

## Basic Configuration

### Store Secrets in Vault

First, store some secrets in Vault using the CLI:

```bash
# Enable the KV secrets engine (version 2)
vault secrets enable -path=secret kv-v2

# Store application secrets
vault kv put secret/myapp \
    database.username=app_user \
    database.password=super-secret-password \
    api.key=sk-1234567890abcdef

# Store environment-specific secrets
vault kv put secret/myapp/production \
    database.url=jdbc:postgresql://prod-db:5432/myapp \
    api.endpoint=https://api.production.com

vault kv put secret/myapp/development \
    database.url=jdbc:postgresql://localhost:5432/myapp \
    api.endpoint=https://api.staging.com
```

### Application Configuration

Configure Spring Cloud Vault in your bootstrap properties:

```yaml
# bootstrap.yml
spring:
  application:
    name: myapp
  cloud:
    vault:
      # Vault server address
      uri: http://localhost:8200
      # Authentication method
      authentication: TOKEN
      token: ${VAULT_TOKEN:root-token}
      # KV secrets engine configuration
      kv:
        enabled: true
        backend: secret
        # Default context uses application name
        default-context: myapp
        # Profile-specific contexts
        profile-separator: '/'
        # Use KV version 2
        backend-version: 2
      # Fail fast if Vault is unavailable
      fail-fast: true
      # Connection timeout
      connection-timeout: 5000
      read-timeout: 15000
```

### Using Secrets in Your Application

Secrets are automatically injected as configuration properties:

```java
package com.example.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "database")
public class DatabaseConfig {

    // These values come from Vault
    private String username;
    private String password;
    private String url;

    // Getters and setters
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
}
```

```java
package com.example.service;

import com.example.config.DatabaseConfig;
import org.springframework.stereotype.Service;

@Service
public class DatabaseService {

    private final DatabaseConfig config;

    public DatabaseService(DatabaseConfig config) {
        this.config = config;
    }

    public void connect() {
        // Use secrets from Vault
        System.out.println("Connecting to: " + config.getUrl());
        System.out.println("As user: " + config.getUsername());
        // Password is available but should not be logged
    }
}
```

---

## Authentication Methods

### AppRole Authentication

AppRole is recommended for machine-to-machine authentication in production:

```bash
# Enable AppRole authentication
vault auth enable approle

# Create a policy for your application
vault policy write myapp-policy - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "database/creds/myapp-role" {
  capabilities = ["read"]
}
EOF

# Create an AppRole
vault write auth/approle/role/myapp-role \
    token_policies="myapp-policy" \
    token_ttl=1h \
    token_max_ttl=4h \
    secret_id_ttl=10m

# Get the role ID (store this in your deployment config)
vault read auth/approle/role/myapp-role/role-id

# Generate a secret ID (this should be generated per deployment)
vault write -f auth/approle/role/myapp-role/secret-id
```

Configure AppRole authentication in Spring:

```yaml
# bootstrap.yml
spring:
  cloud:
    vault:
      uri: http://vault:8200
      authentication: APPROLE
      app-role:
        role-id: ${VAULT_ROLE_ID}
        secret-id: ${VAULT_SECRET_ID}
        # Path where AppRole is mounted
        app-role-path: approle
```

### Kubernetes Authentication

When running in Kubernetes, use the Kubernetes auth method:

```bash
# Enable Kubernetes authentication in Vault
vault auth enable kubernetes

# Configure Vault to talk to Kubernetes API
vault write auth/kubernetes/config \
    kubernetes_host="https://$KUBERNETES_SERVICE_HOST:$KUBERNETES_SERVICE_PORT"

# Create a role for your application
vault write auth/kubernetes/role/myapp \
    bound_service_account_names=myapp-sa \
    bound_service_account_namespaces=production \
    policies=myapp-policy \
    ttl=1h
```

```yaml
# bootstrap.yml
spring:
  cloud:
    vault:
      uri: http://vault.vault.svc:8200
      authentication: KUBERNETES
      kubernetes:
        role: myapp
        # Path to the service account token
        service-account-token-file: /var/run/secrets/kubernetes.io/serviceaccount/token
```

---

## Dynamic Database Credentials

### Configure Database Secrets Engine

Set up Vault to generate temporary database credentials:

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/mydb \
    plugin_name=postgresql-database-plugin \
    connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/myapp" \
    allowed_roles="myapp-role" \
    username="vault_admin" \
    password="admin_password"

# Create a role that defines credential parameters
vault write database/roles/myapp-role \
    db_name=mydb \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### Spring Configuration for Dynamic Credentials

Enable the database backend in Spring Cloud Vault:

```yaml
# bootstrap.yml
spring:
  cloud:
    vault:
      uri: http://vault:8200
      authentication: APPROLE
      app-role:
        role-id: ${VAULT_ROLE_ID}
        secret-id: ${VAULT_SECRET_ID}
      database:
        enabled: true
        role: myapp-role
        backend: database
        # Property names where credentials will be stored
        username-property: spring.datasource.username
        password-property: spring.datasource.password
```

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:postgresql://db.example.com:5432/myapp
    # username and password come from Vault dynamically
    hikari:
      # Allow connection refresh when credentials rotate
      max-lifetime: 1800000  # 30 minutes
```

### Handling Credential Rotation

Configure your application to handle credential refresh:

```java
package com.example.config;

import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.zaxxer.hikari.HikariDataSource;

import javax.sql.DataSource;

@Configuration
public class DataSourceConfig {

    // RefreshScope allows the datasource to be recreated when credentials change
    @Bean
    @RefreshScope
    public DataSource dataSource(
            @Value("${spring.datasource.url}") String url,
            @Value("${spring.datasource.username}") String username,
            @Value("${spring.datasource.password}") String password) {

        HikariDataSource dataSource = new HikariDataSource();
        dataSource.setJdbcUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);

        // Configure pool for credential rotation
        dataSource.setMaxLifetime(1800000);  // 30 minutes
        dataSource.setConnectionTimeout(30000);
        dataSource.setValidationTimeout(5000);

        return dataSource;
    }
}
```

---

## Transit Secrets Engine

### Encryption as a Service

Use Vault's Transit engine for application-level encryption:

```bash
# Enable the transit secrets engine
vault secrets enable transit

# Create an encryption key
vault write -f transit/keys/myapp-key

# Update policy to allow encryption/decryption
vault policy write myapp-policy - <<EOF
path "secret/data/myapp/*" {
  capabilities = ["read"]
}
path "transit/encrypt/myapp-key" {
  capabilities = ["update"]
}
path "transit/decrypt/myapp-key" {
  capabilities = ["update"]
}
EOF
```

### Encryption Service Implementation

Create a service to encrypt and decrypt sensitive data:

```java
package com.example.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.vault.core.VaultOperations;
import org.springframework.vault.support.Ciphertext;
import org.springframework.vault.support.Plaintext;

import java.util.Base64;

@Service
public class EncryptionService {

    private final VaultOperations vaultOperations;
    private static final String KEY_NAME = "myapp-key";

    @Autowired
    public EncryptionService(VaultOperations vaultOperations) {
        this.vaultOperations = vaultOperations;
    }

    // Encrypt sensitive data
    public String encrypt(String plaintext) {
        // Convert to base64 as Vault expects base64-encoded plaintext
        String base64 = Base64.getEncoder().encodeToString(plaintext.getBytes());

        Ciphertext ciphertext = vaultOperations
            .opsForTransit()
            .encrypt(KEY_NAME, Plaintext.of(base64));

        return ciphertext.getCiphertext();
    }

    // Decrypt data
    public String decrypt(String ciphertext) {
        Plaintext plaintext = vaultOperations
            .opsForTransit()
            .decrypt(KEY_NAME, Ciphertext.of(ciphertext));

        // Decode from base64
        byte[] decoded = Base64.getDecoder().decode(plaintext.asString());
        return new String(decoded);
    }

    // Encrypt with context for additional security
    public String encryptWithContext(String data, String contextId) {
        String base64 = Base64.getEncoder().encodeToString(data.getBytes());

        Ciphertext ciphertext = vaultOperations
            .opsForTransit()
            .encrypt(KEY_NAME, Plaintext.of(base64).with(
                org.springframework.vault.support.VaultTransitContext.builder()
                    .context(contextId.getBytes())
                    .build()
            ));

        return ciphertext.getCiphertext();
    }
}
```

### Using Encryption in Your Application

```java
package com.example.service;

import com.example.entity.User;
import com.example.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final EncryptionService encryptionService;

    public UserService(UserRepository userRepository, EncryptionService encryptionService) {
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
    }

    public User createUser(String name, String ssn) {
        User user = new User();
        user.setName(name);
        // Encrypt sensitive data before storing
        user.setEncryptedSsn(encryptionService.encrypt(ssn));
        return userRepository.save(user);
    }

    public String getUserSsn(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        // Decrypt when retrieving
        return encryptionService.decrypt(user.getEncryptedSsn());
    }
}
```

---

## Secret Lease Renewal

### Automatic Lease Management

Spring Cloud Vault automatically renews leases for dynamic secrets:

```yaml
# bootstrap.yml
spring:
  cloud:
    vault:
      config:
        lifecycle:
          enabled: true
          # Renew leases before they expire
          min-renewal: 10s
          # Grace period before expiry to trigger renewal
          expiry-threshold: 1m
          # How to handle lease renewal failures
          lease-endpoints: SysLeases
```

### Manual Lease Management

For more control, you can manage leases programmatically:

```java
package com.example.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.vault.core.VaultOperations;
import org.springframework.vault.core.lease.SecretLeaseContainer;
import org.springframework.vault.core.lease.event.SecretLeaseCreatedEvent;
import org.springframework.vault.core.lease.event.SecretLeaseExpiredEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Component
public class LeaseManager {

    private static final Logger log = LoggerFactory.getLogger(LeaseManager.class);

    private final SecretLeaseContainer leaseContainer;

    @Autowired
    public LeaseManager(SecretLeaseContainer leaseContainer) {
        this.leaseContainer = leaseContainer;

        // Listen for lease events
        leaseContainer.addLeaseListener(event -> {
            if (event instanceof SecretLeaseCreatedEvent created) {
                log.info("Lease created: {} with TTL: {}s",
                    created.getSource().getPath(),
                    created.getLease().getLeaseDuration().getSeconds());
            } else if (event instanceof SecretLeaseExpiredEvent expired) {
                log.warn("Lease expired: {}", expired.getSource().getPath());
                handleLeaseExpiration(expired);
            }
        });
    }

    private void handleLeaseExpiration(SecretLeaseExpiredEvent event) {
        // Implement custom logic for handling expired leases
        // For example, trigger application restart or credential refresh
        log.error("Critical: Lease expired for {}", event.getSource().getPath());
    }
}
```

---

## Production Configuration

### High Availability Setup

Configure multiple Vault servers for production:

```yaml
# bootstrap.yml
spring:
  cloud:
    vault:
      # Primary Vault server
      uri: https://vault.example.com:8200
      # Enable TLS
      ssl:
        trust-store: classpath:vault-truststore.jks
        trust-store-password: ${TRUSTSTORE_PASSWORD}
      # Connection settings for production
      connection-timeout: 5000
      read-timeout: 15000
      # Retry configuration
      retry:
        enabled: true
        max-attempts: 3
        initial-interval: 1000
        max-interval: 5000
        multiplier: 1.5
```

### Health Checks

Monitor Vault connectivity with Spring Actuator:

```yaml
# application.yml
management:
  health:
    vault:
      enabled: true
  endpoint:
    health:
      show-details: when-authorized
```

```java
package com.example.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.vault.core.VaultOperations;
import org.springframework.vault.support.VaultHealth;

@Component
public class VaultHealthIndicator implements HealthIndicator {

    private final VaultOperations vaultOperations;

    public VaultHealthIndicator(VaultOperations vaultOperations) {
        this.vaultOperations = vaultOperations;
    }

    @Override
    public Health health() {
        try {
            VaultHealth vaultHealth = vaultOperations.opsForSys().health();

            if (vaultHealth.isInitialized() && !vaultHealth.isSealed()) {
                return Health.up()
                    .withDetail("initialized", vaultHealth.isInitialized())
                    .withDetail("sealed", vaultHealth.isSealed())
                    .withDetail("version", vaultHealth.getVersion())
                    .build();
            } else {
                return Health.down()
                    .withDetail("initialized", vaultHealth.isInitialized())
                    .withDetail("sealed", vaultHealth.isSealed())
                    .build();
            }
        } catch (Exception e) {
            return Health.down()
                .withDetail("error", e.getMessage())
                .build();
        }
    }
}
```

---

## Best Practices

1. **Use AppRole or Kubernetes auth in production** - avoid static tokens
2. **Enable dynamic credentials** - rotate automatically with short TTLs
3. **Implement proper error handling** - gracefully handle Vault unavailability
4. **Monitor lease renewals** - alert on renewal failures
5. **Use namespaces** - isolate secrets between environments
6. **Enable audit logging** - track all secret access in Vault

---

## Conclusion

HashiCorp Vault with Spring Cloud Vault provides robust secrets management for Spring Boot applications. Key takeaways:

- Configure Vault integration with Spring Cloud Vault starter
- Use AppRole or Kubernetes authentication in production
- Enable dynamic database credentials for automatic rotation
- Use Transit engine for application-level encryption
- Monitor lease lifecycle for credential health

Centralized secrets management is essential for secure, compliant applications. Vault provides the foundation for zero-trust security in your infrastructure.

---

*Managing secrets across your infrastructure? [OneUptime](https://oneuptime.com) provides comprehensive monitoring for your Vault clusters with health checks and access pattern analysis.*
