# How to Request IPv6 Address Space from LACNIC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, LACNIC, RIR, Latin America, Address Space, Registry

Description: Guide to requesting IPv6 address space from LACNIC for organizations in Latin America and the Caribbean.

## What is LACNIC?

LACNIC is the RIR for Latin America and the Caribbean, serving 33 territories. It manages the allocation of IPv6 address space in the region.

## Who Can Request from LACNIC?

- **Internet Service Providers (ISPs)**: Organizations providing connectivity services
- **End-User Organizations**: Enterprises and institutions using the resources in their own infrastructure without sub-assigning them to third parties
- **Note for Brazil and Mexico**: Organizations headquartered in Brazil or Mexico must request resources from their corresponding NIRs rather than directly from LACNIC

## Membership and Fees

LACNIC uses category-based membership fees for both ISPs and end users. The applicable category depends on the type of organization and the total amount of IPv4 or IPv6 resources assigned. Organizations that receive IP addresses directly from LACNIC automatically become members after the request is approved, the initial assignment fee is paid, and the Registration Services Agreement is signed.

## Step-by-Step Request Process

### 1. Create a LACNIC Account

Create a MiLACNIC user at `https://milacnic.lacnic.net/lacnic/user/new`, then sign in at `https://milacnic.lacnic.net/lacnic/login` with:
- Organization details
- Technical and administrative contact information
- ASN details, if you plan to announce the prefix in inter-domain routing

### 2. Submit an IPv6 Request

Log into MiLACNIC and, if this is your first request, complete the `New Organization` form. Then select the IPv6 request form:

```text
Required information:
- Organization type (ISP or end-user)
- Requested prefix size (minimum /32 for ISPs, minimum /48 for end-users)
- Detailed addressing and deployment plan
- Planned use of the block in the next 3, 6, and 12 months
- Network topology and routing information (for end-user requests)
- Country of operation / coverage-area details
```

### 3. Initial Allocation Policy

LACNIC's policy for initial ISP allocations:
- ISPs with existing LACNIC IPv4 resources typically receive a single /32 IPv6 allocation
- ISPs without a previous LACNIC IPv4 allocation may receive /32 if they document an IPv6 deployment plan
- Larger initial allocations than /32 require additional justification

## Delegating to Customers

After receiving your /32, register customer IPv6 assignments of /48 or larger in the LACNIC Whois database within 7 days through the `IP Sub-Assignments` function in MiLACNIC. For ISP-to-customer delegations, the status is `reallocated` and the parent block appears as `inetnum-up`:

```text
# Representative customer /48 WHOIS record

inetnum:     2001:db8:100::/48
status:      reallocated
owner:       CUSTOMER-A LTDA
ownerid:     BR-EXAMPLE-LACNIC
country:     BR
owner-c:     CAL
tech-c:      CAL
abuse-c:     CAL
inetnum-up:  2001:db8::/32
```

## RPKI Configuration with LACNIC

LACNIC provides hosted and delegated RPKI services. After allocation:

1. Access the `Resource Certification (RPKI)` section through your MiLACNIC account
2. In hosted mode, create ROAs for the prefixes and origin ASNs you intend to announce
3. If you need delegated RPKI, request it through `hostmaster@lacnic.net`
4. Check the resulting origin-validation state at `https://milacnic.lacnic.net/lacnic/rpki/state`

## Policy for IPv6 in Brazil (Registro.br)

Organizations headquartered in Brazil must request IP address space and related services through `Registro.br`, the corresponding NIR for the country, rather than directly from LACNIC. Contact `numeracao@registro.br` or visit `https://registro.br/tecnologia/provedor-acesso.html?secao=numeracao#a03` for Brazil-specific guidance.

## Contact and Support

- Portal: `https://www.lacnic.net`
- MiLACNIC: `https://milacnic.lacnic.net/lacnic/login`
- Email: `hostmaster@lacnic.net`
- Phone: `+598 2 6042222`

## Conclusion

LACNIC serves as the IPv6 address registry for Latin America and the Caribbean. Its policy sets a minimum /32 allocation for ISPs and a minimum /48 direct assignment for end users, with requests submitted through MiLACNIC. Registering qualifying customer assignments in WHOIS and creating ROAs in MiLACNIC helps keep routing information current and reduces the risk of invalid route origination.
