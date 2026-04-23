# How to Understand RFC 9313 Pros and Cons of IPv6 Transition Technologies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, RFC 9313, IPv6 Transition, Network Standards, Best Practice

Description: A summary of RFC 9313's comparative analysis of IPv6 transition technologies, covering their architectural trade-offs to help network engineers make informed deployment decisions.

## What Is RFC 9313?

RFC 9313, published in October 2022, is an IETF informational document titled "Pros and Cons of IPv6 Transition Technologies for IPv4-as-a-Service (IPv4aaS)." It provides a systematic comparison of IPv6 transition technologies deployed by ISPs to offer IPv4 connectivity over IPv6-only access and/or core infrastructure.

This RFC is essential reading for network architects planning large-scale IPv6 transitions.

## Technologies Covered in RFC 9313

RFC 9313 analyzes five main technologies:

1. **DS-Lite** (RFC 6333) - IPv4-in-IPv6 tunneling with centralized AFTR
2. **lw4o6** (RFC 7596) - DS-Lite variant with CPE-side NAT
3. **MAP-E** (RFC 7597) - Stateless encapsulation with algorithmic mapping
4. **MAP-T** (RFC 7599) - Stateless translation with algorithmic mapping
5. **464XLAT** (RFC 6877) - CLAT+PLAT for IPv6-only networks, especially mobile networks

## Key Evaluation Dimensions

RFC 9313 evaluates each technology across these dimensions:

### 1. Address Sharing (IPv4 Conservation)

All five technologies support IPv4 address sharing (multiple subscribers per IPv4 address). However, the mechanism differs:

- **DS-Lite**: NAPT44 at AFTR (dynamic, centrally managed port allocation)
- **lw4o6, MAP-E, MAP-T**: Port-set allocation (each subscriber gets a fixed port range)

Port-set allocation is more auditable but reduces flexibility.

### 2. State at Provider Equipment

This is the critical scalability dimension:

| Technology | State at Provider Device |
|---|---|
| DS-Lite | Full NAPT44 session table (millions of entries) |
| lw4o6 | Binding table only (one entry per subscriber) |
| MAP-E | No per-flow state (stateless forwarding) |
| MAP-T | No per-flow state (stateless translation) |
| 464XLAT | Full NAT64 session table at PLAT |

RFC 9313 notes that stateless approaches (MAP-E, MAP-T) have significant operational advantages at scale.

### 3. IPv4 Application Compatibility

- **DS-Lite**: Highest compatibility - dynamically allocated ports, standard CGN behavior
- **lw4o6**: Good - restricted ports but standard NAT on CPE
- **MAP-E/MAP-T**: Restricted - port-range limitations may break some apps
- **464XLAT**: Very high - CLAT provides transparent IPv4 to apps including IPv4 literals

RFC 9313 specifically calls out fixed port-range limitations as a potential issue for applications that consume many simultaneous ports.

### 4. Operational Considerations

**Logging and abuse investigation**: All technologies must support subscriber identification from traffic logs. RFC 9313 notes:
- DS-Lite requires timestamp-based NAT log correlation (challenging at scale)
- MAP-E/MAP-T allow deterministic calculation of subscriber from IPv4 address + port (better for abuse investigation)

**Failover and redundancy**: Stateful technologies (DS-Lite, 464XLAT) may require session synchronization between redundant devices to preserve active sessions. Stateless technologies can use ECMP or anycast routing more flexibly because they do not maintain per-flow state.

### 5. CPE Complexity

| Technology | CPE Complexity |
|---|---|
| DS-Lite | Low - just tunnel to AFTR, AFTR does NAPT |
| 464XLAT | Medium - CLAT stateless translation |
| lw4o6 | High - CPE does NAPT + tunnel + port restriction |
| MAP-E | High - CPE does NAPT + encap + port restriction + rule computation |
| MAP-T | High - CPE does NAPT + SIIT + port restriction + rule computation |

## RFC 9313 Recommendations Summary

RFC 9313 is neutral on which technology to deploy, but highlights these key trade-offs:

**Choose DS-Lite when**: CPE simplicity is paramount, and AFTR state scale is manageable.

**Choose lw4o6 when**: AFTR state is a concern, but you want DS-Lite-like CPE behavior with improved ISP scalability.

**Choose MAP-E or MAP-T when**: Maximum ISP scalability is needed, stateless operation is preferred, and CPE complexity is acceptable. MAP-T avoids tunnel overhead.

**Choose 464XLAT when**: Deploying IPv6-only mobile networks where full IPv4 app compatibility (including IPv4 literals) is essential.

## What RFC 9313 Does Not Cover

- Pure NAT64+DNS64 as a standalone option (it focuses on ISP "IPv4aaS" scenarios)
- Dual-stack deployment guidance (it focuses on IPv6-only access and/or core networks)
- In-depth security analysis
- Completed, side-by-side performance benchmark results

## Practical Takeaway

RFC 9313 is valuable for confirming that there is no universally best technology. The right choice depends on:
- Scale (stateful vs stateless preference)
- CPE vendor support
- Application compatibility requirements
- Operational tooling maturity

Reading RFC 9313 before finalizing your IPv6 transition architecture ensures your decision is grounded in IETF community analysis.

## Summary

RFC 9313 provides an authoritative comparison of DS-Lite, lw4o6, MAP-E, MAP-T, and 464XLAT across dimensions including state requirements, application compatibility, CPE complexity, and operational considerations. It confirms that stateless technologies (MAP-E, MAP-T) scale best but require more complex CPE, while 464XLAT remains the best choice for mobile IPv6-only deployments.
