# How to Validate IPv6 Addresses in Rust

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rust, IPv6, Validation, Std::net, Web, Error Handling

Description: Validate IPv6 addresses in Rust using std::net, custom validators, web framework integration, and type-safe address wrappers.

## Basic Validation with std::net

The simplest validation in Rust is attempting to parse - if it succeeds, the address is valid:

```rust
use std::net::Ipv6Addr;

fn is_valid_ipv6(s: &str) -> bool {
    s.parse::<Ipv6Addr>().is_ok()
}

fn main() {
    let tests = [
        ("2001:db8::1", true),
        ("::1", true),
        ("::", true),
        ("fe80::1%eth0", false), // zone IDs not parsed by std
        ("2001:db8::gg", false), // invalid hex
        ("not-an-ip", false),
    ];

    for (addr, expected) in tests {
        let valid = is_valid_ipv6(addr);
        println!("{:<25} valid={} expected={} {}",
            addr, valid, expected,
            if valid == expected { "OK" } else { "FAIL" });
    }
}
```

## Type-Specific Validation

Validate that an address meets specific scope requirements:

```rust
use std::net::Ipv6Addr;

#[derive(Debug)]
enum Ipv6ValidationError {
    ParseError(std::net::AddrParseError),
    NotGlobalUnicast,
    IsLoopback,
    IsUnspecified,
    IsDocumentation,
}

impl std::fmt::Display for Ipv6ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ParseError(e) => write!(f, "parse error: {}", e),
            Self::NotGlobalUnicast => write!(f, "not a global unicast address"),
            Self::IsLoopback => write!(f, "loopback address not allowed"),
            Self::IsUnspecified => write!(f, "unspecified address not allowed"),
            Self::IsDocumentation => write!(f, "documentation address not allowed"),
        }
    }
}

fn validate_public_ipv6(s: &str) -> Result<Ipv6Addr, Ipv6ValidationError> {
    let addr = s.parse::<Ipv6Addr>().map_err(Ipv6ValidationError::ParseError)?;

    if addr.is_loopback() {
        return Err(Ipv6ValidationError::IsLoopback);
    }
    if addr.is_unspecified() {
        return Err(Ipv6ValidationError::IsUnspecified);
    }
    // Check 2001:db8::/32 documentation prefix
    let segs = addr.segments();
    if segs[0] == 0x2001 && segs[1] == 0x0db8 {
        return Err(Ipv6ValidationError::IsDocumentation);
    }
    // Exclude multicast (ff00::/8), link-local (fe80::/10), and
    // unique-local (fc00::/7). `is_unicast_global` exists in std but is
    // unstable, so we inline the relevant prefix checks here.
    if addr.is_multicast()
        || (segs[0] & 0xffc0) == 0xfe80
        || (segs[0] & 0xfe00) == 0xfc00
    {
        return Err(Ipv6ValidationError::NotGlobalUnicast);
    }

    Ok(addr)
}

fn main() {
    let addrs = ["2001:db8::1", "::1", "2a00:1450:4007::200e", "fc00::1"];
    for addr in addrs {
        match validate_public_ipv6(addr) {
            Ok(a) => println!("{} → valid global unicast", a),
            Err(e) => println!("{} → error: {}", addr, e),
        }
    }
}
```

## Newtype Wrapper for Validated Addresses

Using a newtype ensures addresses are always validated before use:

```rust
use std::net::Ipv6Addr;
use std::str::FromStr;

#[derive(Debug, Clone, PartialEq)]
pub struct ValidatedIPv6(Ipv6Addr);

impl ValidatedIPv6 {
    pub fn addr(&self) -> &Ipv6Addr {
        &self.0
    }
}

impl FromStr for ValidatedIPv6 {
    type Err = String;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let addr = s.parse::<Ipv6Addr>()
            .map_err(|e| format!("invalid IPv6: {}", e))?;

        if addr.is_unspecified() {
            return Err("unspecified address not accepted".to_string());
        }

        Ok(ValidatedIPv6(addr))
    }
}

impl std::fmt::Display for ValidatedIPv6 {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

fn main() {
    let valid: Result<ValidatedIPv6, _> = "2001:db8::1".parse();
    let invalid: Result<ValidatedIPv6, _> = "::".parse();

    println!("valid: {:?}", valid);
    println!("invalid: {:?}", invalid);
}
```

## Validation in Axum Web Handlers

```toml
# Cargo.toml

[dependencies]
axum = "0.7"
serde = { version = "1", features = ["derive"] }
tokio = { version = "1", features = ["full"] }
```

```rust
use axum::{extract::Json, http::StatusCode, response::IntoResponse, routing::post, Router};
use serde::{Deserialize, Serialize};
use std::net::Ipv6Addr;

#[derive(Deserialize)]
struct ValidateRequest {
    address: String,
}

#[derive(Serialize)]
struct ValidateResponse {
    valid: bool,
    normalized: Option<String>,
    error: Option<String>,
}

async fn validate_handler(Json(req): Json<ValidateRequest>) -> impl IntoResponse {
    match req.address.parse::<Ipv6Addr>() {
        Ok(addr) => (
            StatusCode::OK,
            Json(ValidateResponse {
                valid: true,
                normalized: Some(addr.to_string()),
                error: None,
            }),
        ),
        Err(e) => (
            StatusCode::BAD_REQUEST,
            Json(ValidateResponse {
                valid: false,
                normalized: None,
                error: Some(e.to_string()),
            }),
        ),
    }
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/validate", post(validate_handler));
    let listener = tokio::net::TcpListener::bind("[::]:3000").await.unwrap();
    println!("Listening on [::]:3000");
    axum::serve(listener, app).await.unwrap();
}
```

## Validating CIDR Prefixes

```rust
use ipnet::Ipv6Net;

fn validate_ipv6_cidr(s: &str) -> Result<Ipv6Net, String> {
    let net: Ipv6Net = s.parse().map_err(|e| format!("invalid CIDR: {}", e))?;

    // Ensure the host bits are zero (strict network address)
    if net.addr() != net.network() {
        return Err(format!(
            "host bits set; did you mean {}?",
            net.network()
        ));
    }

    Ok(net)
}

fn main() {
    let prefixes = ["2001:db8::/32", "2001:db8::1/32", "invalid"];
    for p in prefixes {
        match validate_ipv6_cidr(p) {
            Ok(net) => println!("{} → valid", net),
            Err(e) => println!("{} → {}", p, e),
        }
    }
}
```

## Conclusion

Rust's type system makes IPv6 validation safe and expressive. Parse attempts via `FromStr` provide the baseline. Newtype wrappers encode validation invariants in the type system so invalid addresses can never be passed to functions that require valid ones. For web frameworks, validate in extractors or dedicated handler logic and return structured errors. The `ipnet` crate extends validation to CIDR prefixes.
