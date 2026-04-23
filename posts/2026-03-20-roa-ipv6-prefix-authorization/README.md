# How to Create ROA (Route Origin Authorization) for IPv6 Prefixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RPKI, ROA, IPv6, BGP, Routing Security

Description: Step-by-step instructions for creating Route Origin Authorizations (ROAs) for IPv6 prefixes through your Regional Internet Registry portal.

## What is a ROA?

A Route Origin Authorization (ROA) is a digitally signed object that states which Autonomous System (AS) is authorized to originate a specific IP prefix. ROAs are the core building blocks of RPKI-based BGP security.

A ROA contains:
- The prefix (e.g., `2001:db8::/32`)
- The optional maximum prefix length
- The authorized origin ASN

## Step 1: Log Into Your RIR Portal

Each RIR has a portal for managing ROAs:

| RIR | Portal URL |
|-----|-----------|
| RIPE NCC | https://dashboard.rpki.ripe.net |
| ARIN | https://account.arin.net |
| APNIC | https://my.apnic.net |
| LACNIC | https://milacnic.lacnic.net |
| AFRINIC | https://my.afrinic.net |

## Step 2: Navigate to RPKI/ROA Management

In RIPE NCC as an example:
1. Log in to the **Resource Certification (RPKI) dashboard**
2. Select the relevant LIR or resource holder
3. Open the **ROAs** or **Announcements** tab → **Create ROA**

## Step 3: Define ROA Parameters

When creating a hosted ROA configuration, specify these values:

```text
Prefix:       2001:db8::/32
Max Length:   32           (exact aggregate; use 48 only if you announce /48s)
Origin ASN:   AS64496
Validity:     Managed by the hosted CA
```

**Important notes on max length:**
- Setting max length equal to prefix length restricts to exact prefix only
- A larger max length allows sub-prefix announcements
- Too permissive max lengths can expand the attack surface for forged-origin sub-prefix hijacks

## Step 4: Create Multiple ROAs for Redundancy

If you announce from multiple ASNs (e.g., for multihoming), create a ROA for each:

```text
# ROA 1: Primary upstream ASN

Prefix: 2001:db8::/32, Max-Length: 32, Origin: AS64496

# ROA 2: Secondary upstream ASN
Prefix: 2001:db8::/32, Max-Length: 32, Origin: AS64497

# ROA 3: More specific prefix for traffic engineering
Prefix: 2001:db8:1::/48, Max-Length: 48, Origin: AS64496
```

## Step 5: Verify ROA Propagation

After creation, ROA publication and relying-party refresh can take minutes to hours, depending on the RIR and validator refresh interval. Verify using public RPKI validators:

You can check visually in Cloudflare's RPKI Portal at https://rpki.cloudflare.com/.

```bash
# Check via RIPE's validator
curl "https://stat.ripe.net/data/rpki-validation/data.json?resource=AS64496&prefix=2001:db8::/32"

# Use routinator locally
routinator validate --asn AS64496 --prefix 2001:db8::/32
```

## Step 6: Check for ROA Conflicts

Before creating a ROA, check that no conflicting ROA already exists:

```bash
# List existing VRPs that cover your prefix
routinator vrps --select-prefix 2001:db8::/32 --more-specifics

# Check how a planned RIPE NCC ROA would affect known announcements
curl -H "Content-Type: application/json" \
  -H "ncc-api-authorization: YOUR_API_KEY" \
  -d '{"asn":"AS64496","prefix":"2001:db8::/32","maximalLength":48}' \
  https://my.ripe.net/api/rpki/announcements/affected
```

## Automation with RIPE NCC API

For large networks, automate ROA creation via the RIPE NCC API:

```bash
# Create a ROA via RIPE NCC API
curl \
  -H "Content-Type: application/json" \
  -H "ncc-api-authorization: YOUR_API_KEY" \
  -d '{
    "added": [
      {
        "asn": "AS64496",
        "prefix": "2001:db8::/32",
        "maximalLength": "48"
      }
    ],
    "deleted": []
  }' \
  https://my.ripe.net/api/rpki/roas/publish
```

## Monitoring ROA Health

Monitor ROA expiry and validity using [OneUptime](https://oneuptime.com). Set up HTTP monitors against RPKI validator APIs to alert you before ROAs expire or if your prefixes become INVALID.

## Conclusion

Creating ROAs is the first step to deploying RPKI. Always create ROAs before your peers or upstreams start enforcing RPKI filtering. Use conservative max-length values and monitor certificate and ROA validity, especially if you run a delegated CA.
