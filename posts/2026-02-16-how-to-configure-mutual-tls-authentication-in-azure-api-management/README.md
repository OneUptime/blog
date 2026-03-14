# How to Configure Mutual TLS Authentication in Azure API Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, API Management, mTLS, Security, Certificates, Authentication

Description: Learn how to configure mutual TLS (mTLS) authentication in Azure API Management for client certificate-based API security.

---

Standard TLS is one-directional - the client verifies the server's identity, but the server does not verify the client. Mutual TLS (mTLS) adds client certificate verification, so both sides authenticate each other. This is commonly used in B2B integrations, financial services, healthcare APIs, and any scenario where API keys alone are not secure enough.

Azure API Management supports mTLS both on the inbound side (clients presenting certificates to APIM) and on the outbound side (APIM presenting certificates to backends). In this post, I will walk through configuring both directions.

## How mTLS Works

In a standard TLS handshake, the server presents its certificate, and the client verifies it. In mTLS, the server also requests a certificate from the client. The handshake now goes:

1. Client connects to server
2. Server presents its certificate (just like normal TLS)
3. Server requests a client certificate
4. Client presents its certificate
5. Server verifies the client certificate against a trusted CA or a specific thumbprint
6. If verification passes, the connection is established

In the APIM context, "server" is the APIM gateway, and "client" is the API consumer. The consumer must present a valid certificate that APIM is configured to trust.

## Enabling Client Certificate Negotiation

First, you need to enable client certificate negotiation on your APIM instance. By default, APIM does not request client certificates during the TLS handshake.

Go to your APIM instance in the Azure Portal, click "Custom domains" or "Protocols + ciphers" (depending on your portal version), and enable "Negotiate client certificate." You might also need to configure this on individual custom domains.

For the Developer and Standard tiers, this is a simple toggle. For the Consumption tier, client certificate negotiation is enabled by default.

After enabling this, APIM will ask clients for a certificate during the TLS handshake. Clients that do not present one will still connect (the certificate is optional at the TLS level), but you enforce the requirement in your policies.

## Validating Client Certificates in Policies

Once certificate negotiation is enabled, use the `validate-client-certificate` policy or a `choose` policy to check the certificate:

```xml
<!-- Validate client certificate by checking its thumbprint -->
<!-- Only allows requests from clients presenting a known certificate -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Certificate == null)">
            <return-response>
                <set-status code="403" reason="Forbidden" />
                <set-body>Client certificate is required</set-body>
            </return-response>
        </when>
        <when condition="@(context.Request.Certificate.Thumbprint != "A1B2C3D4E5F6..." )">
            <return-response>
                <set-status code="403" reason="Forbidden" />
                <set-body>Invalid client certificate</set-body>
            </return-response>
        </when>
    </choose>
</inbound>
```

This checks for a specific certificate thumbprint. It is simple but requires updating the policy whenever certificates rotate.

## Certificate Validation Options

You have several ways to validate the client certificate. Here are the most common approaches.

**Thumbprint validation** (shown above): The most restrictive. Only certificates with an exact thumbprint match are accepted. Good for scenarios with a small, known set of clients.

**Issuer validation**: Accept any certificate issued by a specific Certificate Authority:

```xml
<!-- Validate that the client certificate was issued by a trusted CA -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Certificate == null ||
            !context.Request.Certificate.Issuer.Contains("CN=My Trusted CA"))">
            <return-response>
                <set-status code="403" reason="Forbidden" />
                <set-body>Certificate must be issued by the trusted CA</set-body>
            </return-response>
        </when>
    </choose>
</inbound>
```

**Subject validation**: Check that the certificate's subject matches an expected value:

```xml
<!-- Validate the certificate subject matches the expected client identity -->
<inbound>
    <base />
    <choose>
        <when condition="@(context.Request.Certificate == null ||
            !context.Request.Certificate.Subject.Contains("CN=partner-company.com"))">
            <return-response>
                <set-status code="403" reason="Forbidden" />
                <set-body>Invalid certificate subject</set-body>
            </return-response>
        </when>
    </choose>
</inbound>
```

**Expiration check**: Verify the certificate is not expired:

```xml
<!-- Verify the client certificate has not expired -->
<choose>
    <when condition="@(context.Request.Certificate != null &&
        context.Request.Certificate.NotAfter < DateTime.UtcNow)">
        <return-response>
            <set-status code="403" reason="Forbidden" />
            <set-body>Client certificate has expired</set-body>
        </return-response>
    </when>
</choose>
```

## Using the validate-client-certificate Policy

For a cleaner approach, APIM provides the `validate-client-certificate` policy that combines multiple checks:

```xml
<!-- Comprehensive client certificate validation -->
<!-- Checks thumbprint, issuer, subject, and expiration in one policy -->
<inbound>
    <base />
    <validate-client-certificate
        failed-validation-httpcode="403"
        failed-validation-error-message="Client certificate validation failed"
        validate-revocation="true"
        validate-trust="true"
        validate-not-before="true"
        validate-not-after="true">
        <identities>
            <identity
                thumbprint="A1B2C3D4E5F6..."
                issuer="CN=My Trusted CA" />
            <identity
                thumbprint="G7H8I9J0K1L2..."
                issuer="CN=My Trusted CA" />
        </identities>
    </validate-client-certificate>
</inbound>
```

This policy validates the certificate chain, revocation status, validity period, and matches against a list of known identities. It is more robust than manual checks.

## Uploading CA Certificates

If you are validating certificates by issuer (CA trust), you need to upload the CA certificate to APIM so it can verify the certificate chain.

Go to your APIM instance, navigate to "CA certificates," and upload the CA's root certificate (and any intermediate certificates). APIM uses these to build the certificate chain and verify that the client's certificate was issued by a trusted authority.

## Client-Side Configuration

Your API consumers need to include their client certificate in requests. Here is how to do it with common tools.

Using curl:

```bash
# Send a request with a client certificate
# The --cert flag specifies the certificate and private key
curl --cert ./client-cert.pem --key ./client-key.pem \
     -H "Ocp-Apim-Subscription-Key: YOUR_KEY" \
     https://yourapi.azure-api.net/orders/
```

Using C# HttpClient:

```csharp
// Configure HttpClient to use a client certificate
// The certificate is loaded from a PFX file with its password
var handler = new HttpClientHandler();
var cert = new X509Certificate2("client-cert.pfx", "password");
handler.ClientCertificates.Add(cert);

var client = new HttpClient(handler);
client.DefaultRequestHeaders.Add("Ocp-Apim-Subscription-Key", "YOUR_KEY");

var response = await client.GetAsync("https://yourapi.azure-api.net/orders/");
```

Using Python requests:

```python
# Send a request with a client certificate using the requests library
# cert parameter takes a tuple of (certificate_path, key_path)
import requests

response = requests.get(
    "https://yourapi.azure-api.net/orders/",
    headers={"Ocp-Apim-Subscription-Key": "YOUR_KEY"},
    cert=("./client-cert.pem", "./client-key.pem")
)
```

## Outbound mTLS: APIM to Backend

The other direction of mTLS is APIM presenting a client certificate to your backend. This is useful when your backend requires certificate authentication from the gateway.

First, upload the client certificate to APIM. Go to "Certificates" in your APIM instance and upload a PFX file. Note the certificate ID.

Then reference it in a policy or backend configuration:

```xml
<!-- Present a client certificate to the backend service -->
<!-- APIM acts as the client and authenticates to the backend with a certificate -->
<inbound>
    <base />
    <authentication-certificate certificate-id="my-backend-cert" />
</inbound>
```

Alternatively, configure it on the Backend entity so it applies automatically:

```json
{
    "properties": {
        "url": "https://secure-backend.company.com",
        "protocol": "http",
        "credentials": {
            "certificate": [
                "my-backend-cert-id"
            ]
        }
    }
}
```

## Certificate Rotation

Certificates expire, and you need a plan for rotation. Here are some approaches:

**Multiple thumbprints**: Allow both the old and new certificate thumbprints in your validation policy during the rotation window:

```xml
<!-- Allow both old and new certificates during rotation period -->
<choose>
    <when condition="@{
        var thumbprint = context.Request.Certificate?.Thumbprint ?? "";
        return thumbprint == "OLD_THUMBPRINT" || thumbprint == "NEW_THUMBPRINT";
    }">
        <!-- Certificate is valid, proceed -->
    </when>
    <otherwise>
        <return-response>
            <set-status code="403" reason="Forbidden" />
        </return-response>
    </otherwise>
</choose>
```

**Named Values for thumbprints**: Store allowed thumbprints in Named Values so you can update them without changing the policy:

```xml
<!-- Use Named Values for certificate thumbprints -->
<!-- Update the Named Value when rotating certificates - no policy change needed -->
<choose>
    <when condition="@{
        var thumbprint = context.Request.Certificate?.Thumbprint ?? "";
        var allowed = "{{allowed-thumbprints}}".Split(',');
        return allowed.Contains(thumbprint);
    }">
        <!-- Valid -->
    </when>
</choose>
```

**CA-based validation**: Instead of validating individual thumbprints, validate the issuing CA. Any certificate from the trusted CA is accepted, making rotation transparent as long as new certificates come from the same CA.

## Monitoring and Logging

Log certificate details for audit trails:

```xml
<!-- Log client certificate details for audit purposes -->
<inbound>
    <base />
    <trace source="mtls-auth" severity="information">
        <message>@($"Client cert: Subject={context.Request.Certificate?.Subject}, Thumbprint={context.Request.Certificate?.Thumbprint}, Expires={context.Request.Certificate?.NotAfter}")</message>
    </trace>
</inbound>
```

Set up alerts for certificate expiration to catch issues before they cause outages.

## Summary

Mutual TLS in Azure API Management adds a strong layer of client authentication beyond API keys and OAuth tokens. Enable certificate negotiation on your APIM instance, validate certificates in policies using thumbprints, issuers, or the built-in validate-client-certificate policy, and configure outbound certificates for backend authentication. Plan for certificate rotation from the start, either by supporting multiple thumbprints or by validating against a trusted CA. The upfront complexity pays off with a significantly stronger security posture for sensitive APIs.
