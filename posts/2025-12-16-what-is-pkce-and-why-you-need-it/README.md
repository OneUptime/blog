# What is PKCE and Why Your OAuth Implementation Needs It

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Security, OAuth, Authentication, PKCE, API

Description: Learn what PKCE (Proof Key for Code Exchange) is, how it protects OAuth 2.0 authorization flows from interception attacks, and why modern applications should implement it.

---

If you have ever implemented OAuth 2.0 authentication in a mobile app, single-page application, or any public client, you have likely encountered PKCE. But what exactly is it, and why has it become an essential security layer for modern authentication?

## The Problem: Authorization Code Interception

The OAuth 2.0 authorization code flow was designed with web servers in mind. In this flow, when a user authenticates, the authorization server redirects them back to your application with an authorization code. Your server then exchanges this code for an access token using a client secret.

```mermaid
sequenceDiagram
    participant User
    participant App as Application
    participant Auth as Auth Server
    participant API as Resource API

    User->>App: 1. Click "Login"
    App->>Auth: 2. Authorization Request
    Auth->>User: 3. Show Login Page
    User->>Auth: 4. Enter Credentials
    Auth->>App: 5. Redirect with Auth Code
    App->>Auth: 6. Exchange Code + Client Secret
    Auth->>App: 7. Access Token
    App->>API: 8. API Request + Token
    API->>App: 9. Protected Resource
    App->>User: 10. Show Data
```

This works well for confidential clients (server-side applications) because the client secret never leaves the server. But what about public clients like mobile apps or browser-based applications?

### The Client Type Problem

```mermaid
flowchart TB
    subgraph Confidential["Confidential Clients"]
        direction TB
        CS[Client Secret]
        CS --> Server[Server-Side Apps]
        Server --> Safe["Secret stays on server"]
        Safe --> Secure["Secure"]
    end

    subgraph Public["Public Clients"]
        direction TB
        NS[No Secret Possible]
        NS --> Mobile[Mobile Apps]
        NS --> SPA[Browser SPAs]
        NS --> Desktop[Desktop Apps]
        Mobile --> Extract["Can be reverse-engineered"]
        SPA --> Visible["Code visible to users"]
        Desktop --> Decompile["Can be decompiled"]
        Extract --> Vulnerable["Vulnerable"]
        Visible --> Vulnerable
        Decompile --> Vulnerable
    end

    style Secure fill:#2d5a2d,color:#fff
    style Vulnerable fill:#8b0000,color:#fff
```

Public clients cannot securely store a client secret. Any secret embedded in a mobile app can be extracted through reverse engineering. Browser-based apps cannot hide secrets at all since all code is visible to users.

### The Authorization Code Interception Attack

This creates a vulnerability: if an attacker can intercept the authorization code during the redirect, they could exchange it for an access token.

```mermaid
sequenceDiagram
    participant User
    participant App as Legitimate App
    participant Attacker as Malicious App
    participant Auth as Auth Server

    User->>App: 1. Click "Login"
    App->>Auth: 2. Authorization Request
    Auth->>User: 3. User Authenticates

    Note over Auth,Attacker: Redirect via custom URL scheme
    Auth-->>Attacker: 4. Attacker intercepts Auth Code!
    Auth-->>App: 4. Auth Code (never arrives)

    Attacker->>Auth: 5. Exchange stolen code
    Auth->>Attacker: 6. Access Token issued!

    Note over Attacker: Attacker now has full access
```

Common interception vectors include:

```mermaid
flowchart LR
    subgraph Vectors["Interception Vectors"]
        A[Malicious App with<br/>Same URL Scheme]
        B[Browser History<br/>Access]
        C[Referrer Header<br/>Leakage]
        D[Network<br/>Interception]
    end

    Vectors --> Code[Authorization Code]
    Code --> Token[Access Token]
    Token --> Breach["Account Compromise"]

    style Breach fill:#8b0000,color:#fff
```

## Enter PKCE: Proof Key for Code Exchange

PKCE (pronounced "pixy") was introduced in RFC 7636 to solve this exact problem. It provides a way to prove that the application requesting the token exchange is the same one that initiated the authorization request, without requiring a static client secret.

```mermaid
flowchart TB
    subgraph Problem["The Problem"]
        P1[Public clients cannot store secrets]
        P2[Auth codes can be intercepted]
        P3[No way to verify token requester]
    end

    subgraph Solution["PKCE Solution"]
        S1[Generate random verifier per request]
        S2[Send hashed challenge with auth request]
        S3[Prove knowledge of verifier at token exchange]
    end

    Problem --> PKCE[PKCE RFC 7636]
    PKCE --> Solution

    style PKCE fill:#1e3a5f,color:#fff
```

### How PKCE Works

The mechanism is elegantly simple and relies on cryptographic hashing:

```mermaid
flowchart LR
    subgraph Step1["Step 1: Generate"]
        V[Code Verifier<br/>Random 43-128 chars]
    end

    subgraph Step2["Step 2: Hash"]
        V --> SHA[SHA-256 Hash]
        SHA --> B64[Base64URL Encode]
    end

    subgraph Step3["Step 3: Result"]
        B64 --> C[Code Challenge]
    end

    style V fill:#2d5a2d,color:#fff
    style C fill:#1e3a5f,color:#fff
```

**Step 1: Generate a Code Verifier**

When starting the authorization flow, your application generates a random string called the `code_verifier`. This should be a cryptographically random string between 43 and 128 characters.

```javascript
// Generate a code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

const codeVerifier = generateCodeVerifier();
// Example: "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
```

**Step 2: Create a Code Challenge**

Next, create a `code_challenge` by hashing the verifier using SHA-256 and encoding it with base64url.

```javascript
// Create a code challenge from the verifier
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(hash));
}

const codeChallenge = await generateCodeChallenge(codeVerifier);
// Example: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
```

### The Transformation Process

```mermaid
flowchart TB
    subgraph Input["Input: Code Verifier"]
        V["dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"]
    end

    subgraph Process["Transformation"]
        V --> Encode[UTF-8 Encode]
        Encode --> Hash[SHA-256 Hash]
        Hash --> B64[Base64URL Encode]
    end

    subgraph Output["Output: Code Challenge"]
        B64 --> C["E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"]
    end

    Note1[/"One-way function:<br/>Cannot reverse to get verifier"/]

    style V fill:#2d5a2d,color:#fff
    style C fill:#1e3a5f,color:#fff
```

**Step 3: Include the Challenge in the Authorization Request**

Send the code challenge (not the verifier) along with your authorization request:

```
GET /authorize?
  response_type=code&
  client_id=your-client-id&
  redirect_uri=https://your-app.com/callback&
  scope=openid profile&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256
```

**Step 4: Exchange the Code with the Verifier**

When exchanging the authorization code for tokens, include the original `code_verifier`:

```
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=SplxlOBeZQQYbYS6WxSbIA&
redirect_uri=https://your-app.com/callback&
client_id=your-client-id&
code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk
```

### Complete PKCE Flow

```mermaid
sequenceDiagram
    participant User
    participant App as Application
    participant Auth as Auth Server
    participant API as Resource API

    Note over App: Generate code_verifier
    Note over App: Create code_challenge = SHA256(verifier)

    User->>App: 1. Click "Login"
    App->>Auth: 2. Auth Request + code_challenge

    Note over Auth: Store code_challenge

    Auth->>User: 3. Show Login Page
    User->>Auth: 4. Enter Credentials
    Auth->>App: 5. Redirect with Auth Code

    App->>Auth: 6. Token Request + code_verifier

    Note over Auth: Verify: SHA256(verifier) == stored challenge

    Auth->>App: 7. Access Token (if verified)
    App->>API: 8. API Request + Token
    API->>App: 9. Protected Resource
    App->>User: 10. Show Data
```

The authorization server then hashes the received `code_verifier` and compares it to the stored `code_challenge`. If they match, the token is issued.

### Server-Side Verification

```mermaid
flowchart TB
    subgraph Receive["Token Request Received"]
        Code[Authorization Code]
        Verifier[code_verifier from request]
    end

    subgraph Lookup["Lookup Stored Data"]
        Code --> StoredChallenge[Stored code_challenge]
    end

    subgraph Compute["Compute & Compare"]
        Verifier --> Hash[SHA-256 Hash]
        Hash --> Computed[Computed Challenge]
        Computed --> Compare{Match?}
        StoredChallenge --> Compare
    end

    subgraph Result["Result"]
        Compare -->|Yes| Issue[Issue Access Token]
        Compare -->|No| Reject[Reject Request]
    end

    style Issue fill:#2d5a2d,color:#fff
    style Reject fill:#8b0000,color:#fff
```

### Why PKCE Stops the Attack

```mermaid
sequenceDiagram
    participant User
    participant App as Legitimate App
    participant Attacker as Malicious App
    participant Auth as Auth Server

    Note over App: code_verifier = "abc123..."
    Note over App: code_challenge = SHA256("abc123...")

    User->>App: 1. Click "Login"
    App->>Auth: 2. Auth Request + code_challenge
    Auth->>User: 3. User Authenticates

    Auth-->>Attacker: 4. Attacker intercepts Auth Code

    Attacker->>Auth: 5. Token Request + ???

    Note over Attacker: Attacker has code_challenge<br/>but CANNOT reverse SHA-256<br/>to get code_verifier!

    Auth->>Attacker: 6. REJECTED - Invalid verifier

    Note over App: App still has code_verifier
    App->>Auth: 7. Token Request + code_verifier
    Auth->>App: 8. Access Token (verified!)
```

### Why This Works

The security of PKCE relies on two properties:

```mermaid
flowchart TB
    subgraph Property1["Property 1: One-Way Hashing"]
        Challenge["code_challenge<br/>(public)"]
        Verifier["code_verifier<br/>(secret)"]
        Challenge -.->|"Cannot reverse<br/>SHA-256"| Verifier
        Verifier -->|"Can compute"| Challenge
    end

    subgraph Property2["Property 2: Randomness"]
        R1[Request 1] --> V1[Unique Verifier 1]
        R2[Request 2] --> V2[Unique Verifier 2]
        R3[Request 3] --> V3[Unique Verifier 3]
        Note2[/"Nothing to predict or reuse"/]
    end

    Property1 --> Secure["Attacker cannot forge verification"]
    Property2 --> Secure

    style Secure fill:#2d5a2d,color:#fff
```

1. **One-way hashing**: An attacker who intercepts the authorization code only sees the `code_challenge` (which was sent in the initial request). They cannot reverse the SHA-256 hash to obtain the `code_verifier` needed for the token exchange.

2. **Randomness**: Each authorization flow uses a fresh, random `code_verifier`, so there is nothing to reuse or predict.

Even if an attacker intercepts the authorization code, they cannot complete the token exchange without the `code_verifier` that only exists in your application's memory.

## When Should You Use PKCE?

```mermaid
flowchart TB
    Start[What type of client?] --> Q1{Can store secrets<br/>securely on server?}

    Q1 -->|No| Public[Public Client]
    Q1 -->|Yes| Confidential[Confidential Client]

    Public --> Required["PKCE REQUIRED"]
    Confidential --> Recommended["PKCE RECOMMENDED"]

    subgraph PublicTypes["Public Client Types"]
        Mobile[Mobile Apps<br/>iOS/Android]
        SPA[Single-Page Apps<br/>React/Vue/Angular]
        Desktop[Desktop Apps<br/>Electron/Native]
        CLI[CLI Tools]
    end

    Public --> PublicTypes

    subgraph ConfidentialTypes["Confidential Client Types"]
        Server[Server-Side Apps<br/>Node/Python/Java]
        Backend[Backend Services]
    end

    Confidential --> ConfidentialTypes

    style Required fill:#8b0000,color:#fff
    style Recommended fill:#b8860b,color:#fff
```

### Always Required

- **Mobile applications** (iOS, Android): These are public clients that cannot securely store secrets.
- **Single-page applications**: Browser-based apps have no way to protect static credentials.
- **Desktop applications**: Native apps can be decompiled and secrets extracted.
- **CLI tools**: Command-line applications face the same secret storage challenges.

### Strongly Recommended

- **Server-side applications**: OAuth 2.1 (the upcoming revision) recommends PKCE for all clients, including confidential ones. It provides defense-in-depth against authorization code injection attacks.

The OAuth 2.0 Security Best Current Practice document (RFC 6819) and the newer OAuth 2.1 draft both recommend using PKCE universally.

## Code Challenge Methods

PKCE supports two methods for creating the code challenge:

```mermaid
flowchart LR
    subgraph S256["S256 Method (Recommended)"]
        V1[code_verifier] --> SHA[SHA-256]
        SHA --> B64[Base64URL]
        B64 --> C1[code_challenge]
    end

    subgraph Plain["Plain Method (Fallback)"]
        V2[code_verifier] --> C2[code_challenge]
        Note[/"Same value - minimal security"/]
    end

    style S256 fill:#2d5a2d,color:#fff
    style Plain fill:#8b0000,color:#fff
```

### S256 (Recommended)

The `S256` method uses SHA-256 hashing:

```
code_challenge = BASE64URL(SHA256(code_verifier))
```

This is the recommended and most secure method. Always use this unless the client cannot perform SHA-256 hashing.

### Plain (Fallback Only)

The `plain` method sends the verifier as-is:

```
code_challenge = code_verifier
```

This provides minimal security improvement and should only be used when the client genuinely cannot perform cryptographic operations (which is rare in modern environments).

### Method Comparison

```mermaid
flowchart TB
    subgraph S256["S256 Method"]
        S1["Verifier: abc123...xyz"]
        S2["Challenge: E9Melhoa2Ow..."]
        S1 -.->|"Cannot reverse"| S2
        S3["Attacker sees challenge"]
        S3 -->|"Cannot derive"| S4["Verifier unknown"]
    end

    subgraph Plain["Plain Method"]
        P1["Verifier: abc123...xyz"]
        P2["Challenge: abc123...xyz"]
        P1 -->|"Same value"| P2
        P3["Attacker sees challenge"]
        P3 -->|"Knows"| P4["Verifier exposed!"]
    end

    style S4 fill:#2d5a2d,color:#fff
    style P4 fill:#8b0000,color:#fff
```

## PKCE State Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Initialized: Generate verifier & challenge

    Initialized --> AuthRequestSent: Send auth request<br/>with challenge

    AuthRequestSent --> WaitingForCallback: User authenticates

    WaitingForCallback --> CodeReceived: Receive auth code
    WaitingForCallback --> Expired: Timeout

    CodeReceived --> TokenExchange: Send code + verifier

    TokenExchange --> Success: Verification passed
    TokenExchange --> Failed: Verification failed

    Success --> [*]: Clear verifier
    Failed --> [*]: Clear verifier
    Expired --> [*]: Clear verifier

    note right of Initialized
        Verifier stored in memory
        Challenge sent to server
    end note

    note right of TokenExchange
        Server computes SHA256(verifier)
        Compares with stored challenge
    end note
```

## Implementation Example: Complete Flow

Here is a complete implementation example for a browser-based application:

```javascript
class PKCEAuth {
  constructor(config) {
    this.clientId = config.clientId;
    this.redirectUri = config.redirectUri;
    this.authEndpoint = config.authEndpoint;
    this.tokenEndpoint = config.tokenEndpoint;
  }

  // Generate cryptographically random string
  generateRandomString(length) {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return this.base64URLEncode(array);
  }

  // Base64 URL encode
  base64URLEncode(buffer) {
    return btoa(String.fromCharCode(...buffer))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  // Generate code challenge from verifier
  async generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return this.base64URLEncode(new Uint8Array(hash));
  }

  // Start the authorization flow
  async startAuthFlow() {
    const codeVerifier = this.generateRandomString(32);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    // Store verifier for later use
    sessionStorage.setItem('pkce_verifier', codeVerifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: this.generateRandomString(16)
    });

    window.location.href = `${this.authEndpoint}?${params}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(authorizationCode) {
    const codeVerifier = sessionStorage.getItem('pkce_verifier');

    if (!codeVerifier) {
      throw new Error('No code verifier found');
    }

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        code_verifier: codeVerifier
      })
    });

    // Clear the verifier after use
    sessionStorage.removeItem('pkce_verifier');

    if (!response.ok) {
      throw new Error('Token exchange failed');
    }

    return response.json();
  }
}
```

## Common Pitfalls to Avoid

```mermaid
flowchart TB
    subgraph Pitfalls["Common PKCE Pitfalls"]
        P1["Weak Random<br/>Generation"]
        P2["Insecure Verifier<br/>Storage"]
        P3["Reusing<br/>Verifiers"]
        P4["Using Plain<br/>When S256 Available"]
        P5["Missing State<br/>Parameter"]
    end

    P1 --> R1["Use crypto.getRandomValues()<br/>or crypto.randomBytes()"]
    P2 --> R2["Use sessionStorage<br/>Never localStorage or URLs"]
    P3 --> R3["Generate fresh verifier<br/>for every request"]
    P4 --> R4["Always prefer S256<br/>Plain is last resort"]
    P5 --> R5["State prevents CSRF<br/>PKCE prevents interception"]

    style P1 fill:#8b0000,color:#fff
    style P2 fill:#8b0000,color:#fff
    style P3 fill:#8b0000,color:#fff
    style P4 fill:#8b0000,color:#fff
    style P5 fill:#8b0000,color:#fff

    style R1 fill:#2d5a2d,color:#fff
    style R2 fill:#2d5a2d,color:#fff
    style R3 fill:#2d5a2d,color:#fff
    style R4 fill:#2d5a2d,color:#fff
    style R5 fill:#2d5a2d,color:#fff
```

### 1. Weak Code Verifier Generation

Do not use predictable random number generators. Always use cryptographically secure random sources like `crypto.getRandomValues()` in browsers or `crypto.randomBytes()` in Node.js.

### 2. Storing the Verifier Insecurely

The code verifier should be stored temporarily and securely. In browsers, `sessionStorage` is acceptable. Avoid localStorage as it persists across sessions. Never store it in URLs or cookies.

### 3. Reusing Verifiers

Generate a new code verifier for every authorization request. Reusing verifiers defeats the purpose of PKCE.

### 4. Using Plain Method When S256 is Available

The `plain` method should only be used as a last resort. Modern platforms all support SHA-256 hashing.

### 5. Not Validating State Parameter

While PKCE protects against authorization code interception, you should still use the `state` parameter to prevent CSRF attacks on the authorization endpoint.

## PKCE vs Other Security Measures

```mermaid
flowchart TB
    subgraph Attacks["Attack Types"]
        A1[Code Interception]
        A2[CSRF Attack]
        A3[Token Theft]
        A4[Replay Attack]
    end

    subgraph Protections["Protections"]
        PKCE[PKCE]
        State[State Parameter]
        HTTPS[HTTPS]
        Short[Short Token Lifetime]
    end

    A1 --> PKCE
    A2 --> State
    A3 --> HTTPS
    A3 --> Short
    A4 --> PKCE
    A4 --> Short

    Note1["Use ALL protections together<br/>for defense in depth"]

    style PKCE fill:#1e3a5f,color:#fff
```

## PKCE in Popular Identity Providers

Most major identity providers now support and recommend PKCE:

| Provider | PKCE Support | Documentation |
|----------|--------------|---------------|
| Auth0 | Full support, required for SPAs | auth0.com/docs |
| Okta | Full support, recommended for all clients | developer.okta.com |
| Google | Full support | developers.google.com |
| Microsoft Identity | Full support, required for public clients | docs.microsoft.com |
| AWS Cognito | Full support | docs.aws.amazon.com |
| Keycloak | Full support | keycloak.org |

## OAuth Evolution: PKCE Becoming Mandatory

```mermaid
timeline
    title OAuth Security Evolution
    2012 : OAuth 2.0 Released
         : Client secrets for confidential clients
         : Public clients vulnerable
    2015 : RFC 7636 - PKCE
         : Introduced for mobile apps
         : Optional enhancement
    2020 : OAuth 2.0 Security BCP
         : PKCE recommended for ALL clients
         : Defense in depth approach
    2024 : OAuth 2.1 Draft
         : PKCE REQUIRED for all flows
         : Implicit flow deprecated
    Future : OAuth 2.1 Final
          : PKCE is the standard
          : No more optional security
```

## Summary

PKCE is a critical security enhancement for OAuth 2.0 that protects authorization code flows from interception attacks. By using a dynamically generated code verifier and its hashed challenge, PKCE ensures that only the application that initiated the authorization request can complete the token exchange.

```mermaid
flowchart LR
    subgraph Key["Key Takeaways"]
        K1["Use PKCE for<br/>ALL public clients"]
        K2["Consider PKCE for<br/>confidential clients too"]
        K3["Always use<br/>S256 method"]
        K4["Generate secure<br/>random verifiers"]
        K5["Store verifiers<br/>securely & temporarily"]
    end

    K1 --> Result["Secure OAuth<br/>Implementation"]
    K2 --> Result
    K3 --> Result
    K4 --> Result
    K5 --> Result

    style Result fill:#2d5a2d,color:#fff
```

Key takeaways:

- **Use PKCE for all public clients**: Mobile apps, SPAs, desktop apps, and CLI tools must use PKCE.
- **Consider PKCE for confidential clients too**: Defense-in-depth is always valuable.
- **Always use S256**: The SHA-256 method provides strong security.
- **Generate cryptographically secure verifiers**: Use proper random number generators.
- **Store verifiers securely and temporarily**: Clear them after use.

As OAuth 2.1 becomes the standard, PKCE will transition from a recommendation to a requirement. Implementing it now ensures your authentication flows are secure and future-proof.
