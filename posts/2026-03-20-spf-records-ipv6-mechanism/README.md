# How to Configure SPF Records with IPv6 (ip6: Mechanism)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SPF, IPv6, DNS, Email, DKIM, Mail Deliverability

Description: Configure SPF TXT records to authorize IPv6 mail servers using the ip6: mechanism to prevent email spoofing and improve deliverability.

## Introduction

Sender Policy Framework (SPF) allows domain owners to specify which mail servers are authorized to send email on behalf of their domain. IPv6 sending addresses must be explicitly authorized using the `ip6:` mechanism when mail is sent over IPv6, otherwise SPF evaluation will not match that IPv6 host and the final result depends on the rest of the policy.

## SPF Record Structure

An SPF record is a DNS TXT record on your domain. Its basic structure:

```text
v=spf1 [mechanisms] [modifiers] [all]
```

The `ip6:` mechanism authorizes specific IPv6 addresses or subnets.

## Basic ip6: Mechanism Syntax

```text
ip6:<ipv6-address>           # Single address (/128)
ip6:<ipv6-address>/<prefix>  # Address range
```

## Creating an SPF Record with IPv6

Add a TXT record in your DNS zone. A full example authorizing both IPv4 and IPv6 servers:

```dns
# DNS TXT record for example.com

example.com.  300  IN  TXT  "v=spf1 ip4:203.0.113.10 ip6:2001:db8::10 include:_spf.google.com ~all"
```

For multiple IPv6 addresses:

```dns
example.com.  300  IN  TXT  "v=spf1 ip4:203.0.113.10 ip6:2001:db8::10 ip6:2001:db8::11 ~all"
```

For an entire IPv6 subnet (e.g., /64):

```dns
example.com.  300  IN  TXT  "v=spf1 ip6:2001:db8:cafe:1::/64 ~all"
```

## Using CIDR Notation for IPv6 Ranges

If your mail servers use addresses from a dedicated IPv6 subnet, use CIDR notation to cover the range:

```dns
# Authorize an entire /48 block for a large organization
example.com.  300  IN  TXT  "v=spf1 ip6:2001:db8:1::/48 ~all"

# Authorize a /64 block for a single server cluster
example.com.  300  IN  TXT  "v=spf1 ip4:203.0.113.0/24 ip6:2001:db8:0:1::/64 ~all"
```

## Verifying Your SPF Record

After publishing the DNS record, verify it resolves correctly:

```bash
# Query the SPF TXT record
dig TXT example.com | grep spf

# Use a specific DNS server for verification
dig @8.8.8.8 TXT example.com

# Test SPF validation for a specific sending IP
python3 -c "
import spf
result, explanation = spf.check2(
    i='2001:db8::10',
    s='sender@example.com',
    h='mail.example.com'
)
print(f'Result: {result}')
print(f'Explanation: {explanation}')
"
```

## Testing SPF with Online Tools

Several online tools test SPF lookup results:

```bash
# Use the mxtoolbox SPF checker (command line via curl)
curl -s "https://mxtoolbox.com/api/v1/lookup/spf/example.com" | python3 -m json.tool

# Test with swaks for end-to-end verification
swaks --from sender@example.com \
      --to recipient@gmail.com \
      --server [2001:db8::10]:25 \
      --header "Subject: SPF IPv6 Test"
```

## Common Mistakes

**Forgetting the ip6: prefix**: Using just the IPv6 address without `ip6:` is invalid.

```dns
# WRONG
"v=spf1 2001:db8::10 ~all"

# CORRECT
"v=spf1 ip6:2001:db8::10 ~all"
```

**Exceeding the 10 DNS lookup limit**: Each `include:` counts as a lookup. The `ip6:` mechanism does NOT require a DNS lookup, so it is efficient.

**Using /0**: Never use `ip6:::/0` - it would authorize any IPv6 address in the world to send as your domain.

## All Mechanisms: Soft vs Hard Fail

```dns
# ~all = softfail (typically mark as suspicious but accept)
"v=spf1 ip6:2001:db8::10 ~all"

# -all = fail (receivers may reject mail not from authorized IPs)
"v=spf1 ip6:2001:db8::10 -all"

# +all = allow all (never use this)
"v=spf1 +all"
```

## Conclusion

The `ip6:` SPF mechanism is straightforward and essential for any mail server using IPv6. Always include your IPv6 sending addresses in SPF records, use CIDR notation for ranges, and prefer `-all` for stricter policy enforcement once your SPF record is validated.
