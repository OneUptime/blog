# How to Implement RPKI Route Origin Validation for BGP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, RPKI, Route Origin Validation, Security, ROA, Routing

Description: Learn how to implement RPKI Route Origin Validation to cryptographically verify that BGP route announcements come from authorized autonomous systems.

## What Is RPKI?

Resource Public Key Infrastructure (RPKI) is a cryptographic framework that allows IP address holders to create Route Origin Authorizations (ROAs)-digitally signed records stating which AS is authorized to originate a specific prefix. BGP routers validate incoming routes against the RPKI cache and can reject INVALID routes.

RPKI validation states:
- **Valid:** The route prefix is covered by a ROA whose origin AS matches and whose max-length allows the announced prefix length
- **Invalid:** At least one ROA covers the prefix, but none match both origin AS and max-length
- **NotFound:** No ROA covers the prefix (unknown)

## Architecture

```mermaid
graph LR
    RIR["RIRs (ARIN/RIPE/APNIC/LACNIC/AFRINIC)"]
    ROA["ROA Repository"]
    Validator["RPKI Validator\n(Routinator/OctoRPKI)"]
    Router["BGP Router"]

    RIR --> ROA
    ROA --> Validator
    Validator -- "RTR Protocol" --> Router
```

## Step 1: Deploy an RPKI Validator

Install Routinator (an open-source RPKI validator) on a Linux server:

```bash
# Install Routinator via package manager (Debian/Ubuntu)

sudo apt-get install routinator

# Current Routinator releases ship with bundled RIR TALs; no init step is required

# Start the Routinator daemon with RTR server
routinator server --rtr=192.168.1.100:3323 --http=127.0.0.1:9556

# Test a validation lookup
routinator validate --prefix=203.0.113.0/24 --asn=65001
```

Routinator downloads ROAs from all five RIRs and serves them to routers via the RTR protocol.

## Step 2: Connect Cisco IOS to the RPKI Cache

Configure the router to connect to your Routinator server:

```text
! Define the RPKI cache server (Routinator)
router bgp 65001
 bgp rpki server tcp 192.168.1.100 port 3323 refresh 600
```

Verify the connection:

```text
Router# show ip bgp rpki servers

BGP SOVC neighbor is 192.168.1.100 connected to port 3323
Flags 0, Refresh time is 600, Serial number is 42
InQ has 0 messages, OutQ has 0 messages, formatted msg 9
```

## Step 3: Enable Route Origin Validation

After the RPKI server is configured, Cisco starts assigning validation states. Configure the address family so your route map controls invalid-route handling:

```text
router bgp 65001
 address-family ipv4 unicast
  ! Allow route-map policy to handle invalid routes explicitly
  bgp bestpath prefix-validate allow-invalid
 exit-address-family
```

## Step 4: Configure Policy Based on Validation State

Use route maps to apply policy based on the RPKI validation state:

```text
! Drop INVALID routes - never install them
route-map RPKI_POLICY deny 10
 match rpki invalid

! Accept VALID routes with high local-preference
route-map RPKI_POLICY permit 20
 match rpki valid
 set local-preference 200

! Accept NOTFOUND routes (no ROA exists) with default preference
route-map RPKI_POLICY permit 30
 match rpki not-found
 set local-preference 100

! Apply to an eBGP neighbor
router bgp 65001
 neighbor 203.0.113.1 route-map RPKI_POLICY in
```

## Step 5: Configure RPKI on FRRouting

```text
# In FRR bgpd.conf
rpki
 rpki cache tcp 192.168.1.100 3323 preference 1
 exit
!
route-map RPKI_POLICY deny 10
 match rpki invalid
!
route-map RPKI_POLICY permit 20
 match rpki valid
 set local-preference 200
!
route-map RPKI_POLICY permit 30
 match rpki notfound
 set local-preference 100
!
router bgp 65001
 address-family ipv4 unicast
  neighbor 203.0.113.1 route-map RPKI_POLICY in
 exit-address-family
```

## Step 6: Create Your Own ROA

Register a ROA for your prefix with your RIR (ARIN, RIPE, APNIC, etc.):

- Origin AS: Your AS number
- Prefix: Your allocated prefix (for example, the public /24 you announce)
- Max-length: The maximum prefix length you will announce (typically same as prefix, e.g., /24)

This helps protect your prefix from unauthorized-origin hijacks when networks perform RPKI route origin validation.

## Step 7: Monitor Validation Results

```text
! Check validation state for a specific prefix
Router# show ip bgp 198.51.100.0/24

  BGP routing table entry for 198.51.100.0/24
  ...
  RPKI State valid    <- confirmed by ROA
```

## Conclusion

RPKI Route Origin Validation helps prevent unauthorized-origin hijacks by cryptographically verifying prefix announcements against ROAs. Deploy a local RPKI validator (Routinator), connect it to your routers via RTR, configure route maps to drop INVALID routes, and register ROAs for your own prefixes through your RIR.
