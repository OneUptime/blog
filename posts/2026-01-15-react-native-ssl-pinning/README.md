# How to Implement SSL Pinning in React Native

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: React Native, SSL Pinning, Security, HTTPS, Mobile Development, Certificate Pinning

Description: Learn how to implement SSL/TLS certificate pinning in React Native to protect your app from man-in-the-middle attacks.

---

Mobile applications handle sensitive user data every day, from login credentials to financial information. While HTTPS provides a baseline level of security, it's not immune to sophisticated attacks. SSL pinning adds an extra layer of protection by ensuring your app only communicates with servers presenting specific, trusted certificates. In this comprehensive guide, we'll explore how to implement SSL pinning in React Native applications for both iOS and Android platforms.

## What is SSL Pinning?

SSL pinning, also known as certificate pinning or public key pinning, is a security technique that associates a host with its expected X.509 certificate or public key. When your app makes a network request, it verifies that the server's certificate matches a pre-defined certificate or public key embedded in your application.

In a standard HTTPS connection, your app trusts any certificate signed by a Certificate Authority (CA) in the device's trust store. This creates a potential vulnerability: if an attacker compromises a CA or installs a rogue certificate on the device, they can intercept your app's traffic through a man-in-the-middle (MITM) attack.

SSL pinning mitigates this risk by hardcoding the expected certificate information directly into your app, bypassing the device's trust store entirely.

```
Standard HTTPS Flow:
App → Validates against device trust store → Server

SSL Pinning Flow:
App → Validates against embedded certificate/key → Server
```

## Why SSL Pinning is Important

### Protection Against Man-in-the-Middle Attacks

The primary benefit of SSL pinning is protection against MITM attacks. These attacks occur when an adversary positions themselves between your app and the server, intercepting and potentially modifying traffic. Common scenarios include:

- **Public WiFi attacks**: Attackers on the same network can intercept unprotected traffic
- **Compromised Certificate Authorities**: If a CA is breached, attackers can issue fraudulent certificates
- **Corporate proxy inspection**: Some organizations install root certificates to inspect HTTPS traffic
- **Malware**: Malicious software can install rogue certificates on devices

### Compliance Requirements

Many regulatory frameworks and security standards require certificate pinning for applications handling sensitive data:

- PCI DSS for payment applications
- HIPAA for healthcare applications
- Financial industry regulations
- Enterprise security policies

### Defense in Depth

SSL pinning is part of a defense-in-depth strategy. Even if other security measures fail, pinning provides an additional barrier against network-based attacks.

## Certificate Pinning vs Public Key Pinning

When implementing SSL pinning, you have two main approaches: certificate pinning and public key pinning.

### Certificate Pinning

Certificate pinning validates the entire X.509 certificate presented by the server.

**Pros:**
- Simpler to implement
- Easy to verify which certificate is being used
- More restrictive security model

**Cons:**
- Requires app update when certificate expires (typically every 1-2 years)
- Less flexible for certificate rotation

```typescript
// Example certificate hash
const certificateHash = "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
```

### Public Key Pinning

Public key pinning extracts and validates only the public key from the certificate.

**Pros:**
- Survives certificate renewal if the same key pair is used
- More flexible for certificate rotation
- Longer validity period

**Cons:**
- Slightly more complex to implement
- Requires careful key management

```typescript
// Example public key hash
const publicKeyHash = "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=";
```

### Recommendation

For most applications, **public key pinning** is recommended because it provides better operational flexibility. You can renew certificates without updating your app, as long as you maintain the same public key.

## Implementing with react-native-ssl-pinning

The `react-native-ssl-pinning` library is a popular choice for implementing SSL pinning in React Native. It provides a simple API and supports both iOS and Android.

### Installation

```bash
# Using npm
npm install react-native-ssl-pinning

# Using yarn
yarn add react-native-ssl-pinning

# For React Native 0.60+, auto-linking handles native dependencies
cd ios && pod install
```

### Basic Configuration

First, create a utility module for your pinned network requests:

```typescript
// src/utils/pinnedFetch.ts
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';

interface PinnedRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: string;
  timeoutInterval?: number;
}

const API_BASE_URL = 'https://api.yourservice.com';

// Certificate hashes for your domains
const SSL_PINNING_CONFIG = {
  certs: ['your_certificate'], // Name of cert file without extension
  // OR for public key pinning:
  // sslPinning: {
  //   certs: ['sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=']
  // }
};

export async function secureRequest<T>(
  endpoint: string,
  config: PinnedRequestConfig
): Promise<T> {
  try {
    const response = await pinnedFetch(`${API_BASE_URL}${endpoint}`, {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
      body: config.body,
      timeoutInterval: config.timeoutInterval || 30000,
      sslPinning: SSL_PINNING_CONFIG,
    });

    return response.json();
  } catch (error) {
    handlePinningError(error);
    throw error;
  }
}

function handlePinningError(error: any): void {
  if (error.message?.includes('SSL')) {
    console.error('SSL Pinning validation failed');
    // Implement your error handling strategy
  }
}
```

### Using Public Key Hashes

For public key pinning, specify the SHA-256 hashes of your server's public keys:

```typescript
// src/config/sslPinning.ts
export const SSL_PINNING_CERTS = {
  'api.yourservice.com': {
    sslPinning: {
      certs: [
        'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=', // Primary cert
        'sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=', // Backup cert
      ],
    },
  },
  'auth.yourservice.com': {
    sslPinning: {
      certs: [
        'sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=',
      ],
    },
  },
};
```

### Complete API Client Example

```typescript
// src/api/client.ts
import { fetch as pinnedFetch } from 'react-native-ssl-pinning';
import { SSL_PINNING_CERTS } from '../config/sslPinning';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface ApiResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

interface ApiError {
  message: string;
  code: string;
  isPinningError: boolean;
}

class SecureApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private getHostFromUrl(url: string): string {
    const urlObj = new URL(url);
    return urlObj.hostname;
  }

  private getPinningConfig(url: string) {
    const host = this.getHostFromUrl(url);
    return SSL_PINNING_CERTS[host] || {};
  }

  async request<T>(
    method: HttpMethod,
    endpoint: string,
    data?: object,
    customHeaders?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const pinningConfig = this.getPinningConfig(url);

    try {
      const response = await pinnedFetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...customHeaders,
        },
        body: data ? JSON.stringify(data) : undefined,
        ...pinningConfig,
      });

      return {
        data: await response.json(),
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      throw this.normalizeError(error);
    }
  }

  private normalizeError(error: any): ApiError {
    const isPinningError =
      error.message?.includes('SSL') ||
      error.message?.includes('Certificate') ||
      error.message?.includes('pin');

    return {
      message: error.message || 'Network request failed',
      code: error.code || 'NETWORK_ERROR',
      isPinningError,
    };
  }

  // Convenience methods
  get<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>('GET', endpoint, undefined, headers);
  }

  post<T>(endpoint: string, data: object, headers?: Record<string, string>) {
    return this.request<T>('POST', endpoint, data, headers);
  }

  put<T>(endpoint: string, data: object, headers?: Record<string, string>) {
    return this.request<T>('PUT', endpoint, data, headers);
  }

  delete<T>(endpoint: string, headers?: Record<string, string>) {
    return this.request<T>('DELETE', endpoint, undefined, headers);
  }
}

export const apiClient = new SecureApiClient('https://api.yourservice.com');
```

## iOS Native Implementation

For more control over SSL pinning on iOS, you can implement it natively using `URLSession` and a custom delegate.

### Creating the Native Module

First, create the Objective-C or Swift files for your native module:

```swift
// ios/SSLPinningManager.swift
import Foundation
import Security
import CommonCrypto

@objc(SSLPinningManager)
class SSLPinningManager: NSObject, URLSessionDelegate {

  // Store your certificate public key hashes
  private let pinnedPublicKeyHashes: Set<String> = [
    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="
  ]

  private lazy var session: URLSession = {
    let configuration = URLSessionConfiguration.default
    configuration.timeoutIntervalForRequest = 30
    configuration.timeoutIntervalForResource = 60
    return URLSession(
      configuration: configuration,
      delegate: self,
      delegateQueue: nil
    )
  }()

  // MARK: - URLSessionDelegate

  func urlSession(
    _ session: URLSession,
    didReceive challenge: URLAuthenticationChallenge,
    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
  ) {
    guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
          let serverTrust = challenge.protectionSpace.serverTrust else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    // Evaluate the server trust
    var error: CFError?
    let isValid = SecTrustEvaluateWithError(serverTrust, &error)

    guard isValid else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    // Extract and validate the public key
    guard let serverCertificate = SecTrustGetCertificateAtIndex(serverTrust, 0),
          let serverPublicKey = SecCertificateCopyKey(serverCertificate),
          let serverPublicKeyData = SecKeyCopyExternalRepresentation(serverPublicKey, nil) as Data? else {
      completionHandler(.cancelAuthenticationChallenge, nil)
      return
    }

    // Calculate the hash of the public key
    let publicKeyHash = sha256Hash(data: serverPublicKeyData)

    if pinnedPublicKeyHashes.contains(publicKeyHash) {
      let credential = URLCredential(trust: serverTrust)
      completionHandler(.useCredential, credential)
    } else {
      completionHandler(.cancelAuthenticationChallenge, nil)
    }
  }

  // MARK: - Helper Methods

  private func sha256Hash(data: Data) -> String {
    var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
    data.withUnsafeBytes {
      _ = CC_SHA256($0.baseAddress, CC_LONG(data.count), &hash)
    }
    return Data(hash).base64EncodedString()
  }

  // MARK: - React Native Bridge

  @objc
  func makeRequest(
    _ urlString: String,
    method: String,
    headers: NSDictionary,
    body: String?,
    resolver: @escaping RCTPromiseResolveBlock,
    rejecter: @escaping RCTPromiseRejectBlock
  ) {
    guard let url = URL(string: urlString) else {
      rejecter("INVALID_URL", "Invalid URL provided", nil)
      return
    }

    var request = URLRequest(url: url)
    request.httpMethod = method

    for (key, value) in headers {
      if let key = key as? String, let value = value as? String {
        request.setValue(value, forHTTPHeaderField: key)
      }
    }

    if let body = body {
      request.httpBody = body.data(using: .utf8)
    }

    let task = session.dataTask(with: request) { data, response, error in
      if let error = error {
        rejecter("REQUEST_FAILED", error.localizedDescription, error)
        return
      }

      guard let httpResponse = response as? HTTPURLResponse,
            let data = data else {
        rejecter("INVALID_RESPONSE", "Invalid response received", nil)
        return
      }

      let result: [String: Any] = [
        "status": httpResponse.statusCode,
        "data": String(data: data, encoding: .utf8) ?? "",
        "headers": httpResponse.allHeaderFields
      ]

      resolver(result)
    }

    task.resume()
  }

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
```

### Bridge Header

Create the bridge header to expose the module to React Native:

```objc
// ios/SSLPinningManager.m
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SSLPinningManager, NSObject)

RCT_EXTERN_METHOD(makeRequest:(NSString *)urlString
                  method:(NSString *)method
                  headers:(NSDictionary *)headers
                  body:(NSString *)body
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

## Android Native Implementation

For Android, implement SSL pinning using OkHttp's `CertificatePinner`.

### Creating the Native Module

```kotlin
// android/app/src/main/java/com/yourapp/SSLPinningModule.kt
package com.yourapp

import com.facebook.react.bridge.*
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

class SSLPinningModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SSLPinningManager"

    private val certificatePinner = CertificatePinner.Builder()
        .add("api.yourservice.com", "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
        .add("api.yourservice.com", "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")
        .add("auth.yourservice.com", "sha256/CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=")
        .build()

    private val client = OkHttpClient.Builder()
        .certificatePinner(certificatePinner)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    @ReactMethod
    fun makeRequest(
        urlString: String,
        method: String,
        headers: ReadableMap,
        body: String?,
        promise: Promise
    ) {
        try {
            val requestBuilder = Request.Builder()
                .url(urlString)

            // Add headers
            val headerIterator = headers.keySetIterator()
            while (headerIterator.hasNextKey()) {
                val key = headerIterator.nextKey()
                val value = headers.getString(key)
                if (value != null) {
                    requestBuilder.addHeader(key, value)
                }
            }

            // Set method and body
            val requestBody = body?.toRequestBody("application/json".toMediaType())
            when (method.uppercase()) {
                "GET" -> requestBuilder.get()
                "POST" -> requestBuilder.post(requestBody ?: "".toRequestBody())
                "PUT" -> requestBuilder.put(requestBody ?: "".toRequestBody())
                "DELETE" -> requestBuilder.delete(requestBody)
                "PATCH" -> requestBuilder.patch(requestBody ?: "".toRequestBody())
            }

            val request = requestBuilder.build()

            client.newCall(request).enqueue(object : Callback {
                override fun onFailure(call: Call, e: IOException) {
                    val errorMessage = when {
                        e.message?.contains("Certificate pinning failure") == true ->
                            "SSL_PINNING_ERROR"
                        else -> "NETWORK_ERROR"
                    }
                    promise.reject(errorMessage, e.message, e)
                }

                override fun onResponse(call: Call, response: Response) {
                    try {
                        val result = Arguments.createMap().apply {
                            putInt("status", response.code)
                            putString("data", response.body?.string() ?: "")

                            val headersMap = Arguments.createMap()
                            response.headers.forEach { (name, value) ->
                                headersMap.putString(name, value)
                            }
                            putMap("headers", headersMap)
                        }
                        promise.resolve(result)
                    } catch (e: Exception) {
                        promise.reject("PARSE_ERROR", e.message, e)
                    }
                }
            })
        } catch (e: Exception) {
            promise.reject("REQUEST_ERROR", e.message, e)
        }
    }
}
```

### Register the Module

```kotlin
// android/app/src/main/java/com/yourapp/SSLPinningPackage.kt
package com.yourapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class SSLPinningPackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> {
        return listOf(SSLPinningModule(reactContext))
    }

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

### Network Security Config (Android)

For Android 7.0+, create a network security configuration:

```xml
<!-- android/app/src/main/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="false">
        <domain includeSubdomains="true">api.yourservice.com</domain>
        <domain includeSubdomains="true">auth.yourservice.com</domain>
        <pin-set expiration="2026-12-31">
            <pin digest="SHA-256">AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=</pin>
            <pin digest="SHA-256">BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=</pin>
        </pin-set>
    </domain-config>
</network-security-config>
```

Reference it in your AndroidManifest.xml:

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
```

## Obtaining Certificates

Before implementing SSL pinning, you need to obtain the certificate or public key hash from your server.

### Using OpenSSL

Extract the certificate and calculate its public key hash:

```bash
# Download the certificate chain
openssl s_client -connect api.yourservice.com:443 -showcerts < /dev/null 2>/dev/null | \
  openssl x509 -outform PEM > certificate.pem

# Extract the public key
openssl x509 -in certificate.pem -pubkey -noout > publickey.pem

# Calculate the SHA-256 hash of the public key
openssl x509 -in certificate.pem -pubkey -noout | \
  openssl pkey -pubin -outform der | \
  openssl dgst -sha256 -binary | \
  openssl enc -base64
```

### Using a Script

Create a utility script to automate certificate extraction:

```bash
#!/bin/bash
# scripts/get-ssl-pins.sh

DOMAINS=("api.yourservice.com" "auth.yourservice.com")

for domain in "${DOMAINS[@]}"; do
    echo "Certificates for $domain:"
    echo "=========================="

    # Get the certificate chain
    certs=$(openssl s_client -connect "$domain:443" -showcerts 2>/dev/null </dev/null)

    # Extract and hash each certificate
    echo "$certs" | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/' | while read -r line; do
        if [ "$line" == "-----BEGIN CERTIFICATE-----" ]; then
            cert=""
        fi
        cert="$cert$line\n"
        if [ "$line" == "-----END CERTIFICATE-----" ]; then
            hash=$(echo -e "$cert" | openssl x509 -pubkey -noout 2>/dev/null | \
                   openssl pkey -pubin -outform der 2>/dev/null | \
                   openssl dgst -sha256 -binary | openssl enc -base64)
            echo "sha256/$hash"
        fi
    done
    echo ""
done
```

### Online Tools

You can also use online tools like SSL Labs (ssllabs.com/ssltest) to analyze your server's certificates and obtain the necessary hashes.

## Certificate Rotation Strategy

Certificate rotation is one of the biggest operational challenges with SSL pinning. Without a proper strategy, your app can become unusable when certificates expire.

### Pin Multiple Certificates

Always pin at least two certificates: your current certificate and a backup:

```typescript
const SSL_PINS = {
  'api.yourservice.com': {
    sslPinning: {
      certs: [
        'sha256/CurrentCertHash...',  // Currently active
        'sha256/BackupCertHash...',   // Backup/next certificate
      ],
    },
  },
};
```

### Rolling Updates

Implement a rolling update strategy:

1. **Phase 1**: Generate a new certificate/key pair
2. **Phase 2**: Add the new pin to your app (alongside existing pins)
3. **Phase 3**: Deploy the new app version
4. **Phase 4**: Wait for sufficient app adoption (monitor analytics)
5. **Phase 5**: Switch to the new certificate on your server
6. **Phase 6**: In the next app release, remove the old pin

### Dynamic Pin Updates

For more flexibility, consider fetching pins from a trusted source:

```typescript
// src/services/pinningService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PinConfig {
  domain: string;
  pins: string[];
  expiresAt: string;
}

const PINS_STORAGE_KEY = 'ssl_pins_config';
const PINS_UPDATE_URL = 'https://config.yourservice.com/ssl-pins.json';

// Hardcoded fallback pins (always include these)
const FALLBACK_PINS: Record<string, string[]> = {
  'api.yourservice.com': [
    'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  ],
};

export async function getPins(domain: string): Promise<string[]> {
  try {
    // Try to get cached pins
    const cached = await AsyncStorage.getItem(PINS_STORAGE_KEY);
    if (cached) {
      const configs: PinConfig[] = JSON.parse(cached);
      const config = configs.find(c => c.domain === domain);

      if (config && new Date(config.expiresAt) > new Date()) {
        return config.pins;
      }
    }
  } catch (error) {
    console.warn('Failed to read cached pins:', error);
  }

  // Return fallback pins
  return FALLBACK_PINS[domain] || [];
}

export async function updatePins(): Promise<void> {
  try {
    // This request should use hardcoded pins for the config domain
    const response = await fetch(PINS_UPDATE_URL);
    const configs: PinConfig[] = await response.json();

    // Validate the response
    if (Array.isArray(configs) && configs.every(isValidPinConfig)) {
      await AsyncStorage.setItem(PINS_STORAGE_KEY, JSON.stringify(configs));
    }
  } catch (error) {
    console.warn('Failed to update pins:', error);
  }
}

function isValidPinConfig(config: any): config is PinConfig {
  return (
    typeof config.domain === 'string' &&
    Array.isArray(config.pins) &&
    config.pins.every((p: any) => typeof p === 'string') &&
    typeof config.expiresAt === 'string'
  );
}
```

## Handling Pinning Failures

When SSL pinning fails, your app needs to handle the situation gracefully while maintaining security.

### Error Detection

```typescript
// src/utils/errorHandler.ts
export interface NetworkError {
  code: string;
  message: string;
  isPinningFailure: boolean;
  isNetworkError: boolean;
}

export function classifyError(error: any): NetworkError {
  const message = error.message?.toLowerCase() || '';

  const pinningKeywords = [
    'ssl',
    'certificate',
    'pin',
    'trust',
    'handshake',
    'peer not authenticated',
  ];

  const isPinningFailure = pinningKeywords.some(keyword =>
    message.includes(keyword)
  );

  const networkKeywords = [
    'network',
    'timeout',
    'connection',
    'unreachable',
  ];

  const isNetworkError = networkKeywords.some(keyword =>
    message.includes(keyword)
  );

  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unknown error occurred',
    isPinningFailure,
    isNetworkError,
  };
}
```

### User-Facing Error Handling

```typescript
// src/components/NetworkErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { classifyError, NetworkError } from '../utils/errorHandler';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
}

interface State {
  hasError: boolean;
  error: NetworkError | null;
}

export class NetworkErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: classifyError(error),
    };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { error } = this.state;

      if (error.isPinningFailure) {
        return (
          <View style={styles.container}>
            <Text style={styles.title}>Security Error</Text>
            <Text style={styles.message}>
              We couldn't establish a secure connection. Please ensure you're
              using the latest version of the app and try again.
            </Text>
            <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
              <Text style={styles.buttonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        );
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Connection Error</Text>
          <Text style={styles.message}>
            Unable to connect. Please check your internet connection.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
```

### Logging and Monitoring

```typescript
// src/services/securityMonitoring.ts
import analytics from '@react-native-firebase/analytics';

interface SecurityEvent {
  type: 'SSL_PINNING_FAILURE' | 'CERTIFICATE_EXPIRED' | 'SECURITY_WARNING';
  domain: string;
  timestamp: string;
  details?: string;
}

export async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  // Log to analytics
  await analytics().logEvent('security_event', {
    event_type: event.type,
    domain: event.domain,
    timestamp: event.timestamp,
  });

  // In production, you might also want to send to your own backend
  // for security monitoring and alerting
  if (__DEV__) {
    console.warn('Security Event:', event);
  }
}

export function createPinningFailureEvent(
  domain: string,
  error: Error
): SecurityEvent {
  return {
    type: 'SSL_PINNING_FAILURE',
    domain,
    timestamp: new Date().toISOString(),
    details: error.message,
  };
}
```

## Testing SSL Pinning

Testing SSL pinning is crucial to ensure it works correctly before shipping to production.

### Unit Testing

```typescript
// __tests__/sslPinning.test.ts
import { classifyError } from '../src/utils/errorHandler';

describe('SSL Pinning Error Classification', () => {
  it('should identify SSL pinning errors', () => {
    const sslError = new Error('SSL handshake failed');
    const result = classifyError(sslError);

    expect(result.isPinningFailure).toBe(true);
    expect(result.isNetworkError).toBe(false);
  });

  it('should identify certificate errors', () => {
    const certError = new Error('Certificate validation failed');
    const result = classifyError(certError);

    expect(result.isPinningFailure).toBe(true);
  });

  it('should identify network errors separately', () => {
    const networkError = new Error('Network connection timeout');
    const result = classifyError(networkError);

    expect(result.isPinningFailure).toBe(false);
    expect(result.isNetworkError).toBe(true);
  });
});
```

### Integration Testing

Create a test server with a different certificate to verify pinning works:

```typescript
// __tests__/integration/sslPinning.integration.test.ts
import { secureRequest } from '../../src/utils/pinnedFetch';

describe('SSL Pinning Integration', () => {
  it('should succeed with valid pinned certificate', async () => {
    const response = await secureRequest('/health', { method: 'GET' });
    expect(response).toBeDefined();
  });

  it('should fail with invalid certificate', async () => {
    // This test requires a separate test endpoint with wrong certificate
    await expect(
      secureRequest('/test-wrong-cert', { method: 'GET' })
    ).rejects.toThrow();
  });
});
```

### Manual Testing Checklist

Before releasing your app, manually verify:

1. App connects successfully to production servers
2. App fails to connect through proxy tools (Charles/Proxyman) without special configuration
3. App handles certificate rotation correctly
4. Error messages are user-friendly
5. Analytics/logging captures pinning failures

## Debugging with Charles and Proxyman

During development, you'll need to bypass SSL pinning to debug network traffic. Here's how to set up your debugging environment.

### Development Build Configuration

Create a development-only configuration that disables pinning:

```typescript
// src/config/environment.ts
export const IS_DEV = __DEV__;

export const SSL_PINNING_ENABLED = !IS_DEV;

// src/utils/pinnedFetch.ts
import { SSL_PINNING_ENABLED } from '../config/environment';

export async function secureRequest<T>(
  endpoint: string,
  config: RequestConfig
): Promise<T> {
  const pinningConfig = SSL_PINNING_ENABLED
    ? SSL_PINNING_CONFIG
    : {};

  // ... rest of implementation
}
```

### iOS Simulator with Charles

For iOS, add Charles's certificate to your development configuration:

```xml
<!-- ios/YourApp/Info.plist (Development only) -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

### Android Emulator with Charles

Create a debug network security config:

```xml
<!-- android/app/src/debug/res/xml/network_security_config.xml -->
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <debug-overrides>
        <trust-anchors>
            <certificates src="user"/>
            <certificates src="system"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>
```

### Proxyman Setup

For Proxyman on macOS:

1. Install Proxyman's certificate on your device/simulator
2. Enable the development bypass in your app
3. Configure your device to use Proxyman as proxy

```bash
# For iOS Simulator
# Proxyman automatically handles simulator traffic

# For Android Emulator
adb reverse tcp:9090 tcp:9090
```

## Best Practices and Common Pitfalls

### Best Practices

**1. Always Pin Multiple Certificates**

Never rely on a single pin. Include at least one backup:

```typescript
const pins = [
  'sha256/PrimaryCertHash...',
  'sha256/BackupCertHash...',
  'sha256/IntermediateCertHash...', // Pin intermediate CA too
];
```

**2. Pin the Intermediate Certificate**

Pinning the intermediate CA certificate provides more flexibility than pinning the leaf certificate:

```typescript
// More resilient - survives leaf certificate renewal
const intermediatePins = [
  'sha256/IntermediateCACertHash...',
];
```

**3. Implement Graceful Degradation**

Don't completely break your app on pinning failures:

```typescript
async function fetchWithFallback<T>(endpoint: string): Promise<T> {
  try {
    return await secureRequest(endpoint);
  } catch (error) {
    if (isPinningError(error)) {
      // Log for monitoring
      logSecurityEvent(createPinningFailureEvent(endpoint, error));

      // Show user-friendly message
      throw new UserFacingError(
        'Please update your app to continue using this feature.'
      );
    }
    throw error;
  }
}
```

**4. Monitor Pinning Failures**

Set up alerts for pinning failures in production:

```typescript
// Send to your monitoring service
if (error.isPinningFailure) {
  await sendToMonitoring({
    event: 'SSL_PINNING_FAILURE',
    severity: 'critical',
    domain: getDomainFromUrl(url),
    appVersion: getAppVersion(),
    platform: Platform.OS,
  });
}
```

**5. Document Your Rotation Process**

Create a runbook for certificate rotation:

```markdown
## Certificate Rotation Runbook

1. Generate new certificate (2 weeks before expiry)
2. Calculate new public key hash
3. Add new pin to app config
4. Release app update
5. Monitor adoption rate (target: 80%+)
6. Switch server to new certificate
7. Remove old pin in next release
```

### Common Pitfalls

**1. Pinning Only the Leaf Certificate**

This forces an app update with every certificate renewal. Pin the public key instead, or pin intermediate certificates.

**2. No Backup Pins**

Without backup pins, certificate emergencies require emergency app releases.

```typescript
// DON'T do this
const pins = ['sha256/OnlyOneCert...'];

// DO this instead
const pins = [
  'sha256/CurrentCert...',
  'sha256/BackupCert...',
];
```

**3. Forgetting About Certificate Chains**

Servers often send certificate chains. Make sure you're pinning the right certificate in the chain.

**4. Not Testing Certificate Rotation**

Test your rotation process before you need it in production:

```bash
# Set up a test environment with a different certificate
# Verify your app handles the transition correctly
```

**5. Blocking Debug Tools in Development**

Make sure developers can still debug network traffic:

```typescript
const ENABLE_PINNING = !__DEV__ || FORCE_PINNING_IN_DEV;
```

**6. Ignoring Platform Differences**

iOS and Android handle certificate validation differently. Test on both platforms thoroughly.

**7. Not Handling Clock Skew**

Devices with incorrect time settings may fail certificate validation. Consider implementing time synchronization checks.

## Conclusion

SSL pinning is a powerful security measure that protects your React Native app from man-in-the-middle attacks. While it adds complexity to your development and deployment processes, the security benefits are well worth the effort, especially for applications handling sensitive data.

Key takeaways:

1. **Choose public key pinning** for better operational flexibility
2. **Always pin multiple certificates** to avoid service disruptions
3. **Plan for certificate rotation** from the start
4. **Implement proper error handling** to maintain good user experience
5. **Monitor pinning failures** to detect potential attacks or configuration issues
6. **Test thoroughly** on both iOS and Android platforms

By following the patterns and best practices outlined in this guide, you can implement robust SSL pinning in your React Native application while maintaining the flexibility needed for ongoing operations.

Remember that SSL pinning is just one part of a comprehensive mobile security strategy. Combine it with other security measures like code obfuscation, secure storage, and proper authentication to build truly secure mobile applications.
