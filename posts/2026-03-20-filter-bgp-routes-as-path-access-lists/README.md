# How to Filter BGP Routes Using AS-Path Access Lists

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: BGP, AS-Path, Route Filtering, Cisco IOS, Regular Expression, Routing

Description: Learn how to create AS-path access lists with regular expressions to filter BGP routes based on the AS-path attribute for traffic engineering and security.

## What Is an AS-Path Access List?

The BGP AS-path attribute records the sequence of autonomous systems a route has traversed. AS-path access lists use regular expressions (regex) to match against this string, allowing you to permit or deny routes based on their origin AS, transit ASes, or path length.

## AS-Path Regex Basics

| Pattern | Meaning |
|---|---|
| `^$` | Locally originated routes (empty AS path) |
| `^65001$` | Exactly AS 65001, no others |
| `^65001_` | AS 65001 is the first AS in the path |
| `_65001$` | AS 65001 is the last AS (origin AS) |
| `_65001_` | AS 65001 appears anywhere in the path |
| `.*` | Matches any AS path (permit all) |
| `^[0-9]+$` | Single-AS path (one hop away) |

The underscore `_` matches any delimiter character: space, comma, `{`, `}`, `(`, `)`, beginning of string, or end of string.

## Step 1: Create an AS-Path Access List

AS-path access lists are numbered 1–500:

```text
! Permit routes originated by AS 65100 only
ip as-path access-list 1 permit ^65100$

! Deny routes that have traversed AS 7018 (AT&T) - traffic engineering
ip as-path access-list 2 deny _7018_
ip as-path access-list 2 permit .*

! Permit only single-AS paths (one AS hop away)
ip as-path access-list 3 permit ^[0-9]+$
ip as-path access-list 3 deny .*

! Permit only locally originated routes (for outbound filtering)
ip as-path access-list 4 permit ^$
```

## Step 2: Test Your Regex Before Applying

Use `show ip bgp regexp` to test your pattern against the current BGP table before applying it as a filter:

```text
! Test which routes match the pattern for AS 65100
Router# show ip bgp regexp ^65100$

! Test which routes have AS 7018 in the path
Router# show ip bgp regexp _7018_
```

Review the output carefully to confirm the regex matches only the intended routes.

## Step 3: Apply the AS-Path Filter to a BGP Neighbor

Apply the access list inbound or outbound using `neighbor X filter-list`:

```text
router bgp 65001
 ! Accept only routes originated by AS 65100
 neighbor 10.0.0.1 filter-list 1 in

 ! Advertise only our own routes outbound (AS path is empty for local routes)
 neighbor 10.0.0.2 filter-list 4 out
```

## Step 4: Combine with a Route Map for More Control

For more complex filtering, use the AS-path access list as a match condition inside a route map:

```text
! Create route map that uses AS-path matching
route-map FILTER_UPSTREAM permit 10
 match as-path 1
 set local-preference 200

route-map FILTER_UPSTREAM deny 20
 ! Explicit catch-all deny for everything else

! Apply route map to neighbor inbound
router bgp 65001
 neighbor 203.0.113.1 route-map FILTER_UPSTREAM in
```

## Step 5: Verify Filter Effects

After applying, perform a soft reset and check the BGP table:

```text
! Soft-reset inbound to apply new filter
Router# clear ip bgp 203.0.113.1 soft in

! Verify which routes are now accepted
Router# show ip bgp neighbors 203.0.113.1 routes

! Review the configured AS-path access lists
Router# show ip as-path-access-list
```

## Common Use Cases

- **Customer prefix enforcement:** Only accept routes with the customer's AS as origin (`_65100$`)
- **Own-AS loop defense:** Reject routes with your own AS in the path (`_65001_`) if you have enabled exceptions such as `allowas-in`
- **Transit filtering:** Avoid routes through specific ASes for legal or policy reasons
- **Outbound announcement:** Only advertise your own prefixes (`^$` for locally originated)

## Conclusion

AS-path access lists provide regex-based BGP filtering that prefix lists cannot achieve. Use `^$` for local routes, `_ASNUM$` for origin filtering, and always test patterns with `show ip bgp regexp` before applying them. Combine with route maps for setting attributes alongside filtering.
