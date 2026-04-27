# Validation Summary: How to Configure OSPFv3 on Linux with BIRD

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- BIRD2 (BIRD Internet Routing Daemon, version 2.x)
- OSPFv3 (RFC 5340)
- IPv6 routing
- Linux (Debian/Ubuntu, RHEL/CentOS/Fedora)
- systemd / birdc CLI

## Sources Consulted
- BIRD 2.0 User's Guide — Section 1 (Command-line args): https://bird.network.cz/?get_doc&v=20&f=bird-1.html
- BIRD 2.0 User's Guide — Section 4 (Remote control / birdc): https://bird.network.cz/?get_doc&v=20&f=bird-4.html
- BIRD 2.0 User's Guide — Section 6 (Protocols: Device, Direct, Kernel, OSPF): https://bird.network.cz/?get_doc&v=20&f=bird-6.html
- Debian package index (`bird2`): https://packages.debian.org/search?keywords=bird2
- Fedora package index (`bird`): https://packages.fedoraproject.org/pkgs/bird/bird/
- RFC 5340 (OSPF for IPv6)

## Issues Found
1. **Stub area: `stub cost 20;` is not valid BIRD syntax.** The correct option for setting the cost of the default route propagated into a stub area is `default cost <num>;` per BIRD docs (Section 6, OSPF area options). Changed `stub cost 20;` → `default cost 20;`.

2. **`birdc` show commands used quoted protocol names and singular `neighbor`.** Per BIRD's CLI grammar, the protocol name argument is a bare symbol (not a quoted string) and the keyword is `neighbors` (plural). Additionally, `show ospf <name>` alone is not a defined command — to show state you use `show ospf state <name>`. Updated:
   - `show ospf neighbor "OSPF_V6"` → `show ospf neighbors OSPF_V6`
   - `show ospf "OSPF_V6"` → `show ospf state OSPF_V6`
   - `show ospf topology "OSPF_V6"` → `show ospf topology OSPF_V6`

3. **Inaccurate comment for `protocol device`.** The comment claimed it "learns connected routes," but per BIRD docs the Device protocol "is not a real routing protocol. It doesn't generate any routes and only serves as a module for getting information about network interfaces from the kernel." Connected routes are produced by the separate Direct protocol. Updated the comments on both `protocol device` and `protocol direct` to accurately describe their roles.

4. **Wrong package name on RHEL/CentOS/Fedora.** Fedora and EPEL 8/9 ship BIRD 2.x as the package `bird` (not `bird2`). Changed `sudo dnf install bird2` → `sudo dnf install bird`.

## Review Notes
- The `bird2` package name remains correct on Debian (bullseye/bookworm) and Ubuntu (20.04/22.04). On Debian 13 (trixie) and newer, the package was renamed back to `bird`; this may need a future update once those distros become the norm.
- `import all;` inside `protocol kernel` is the default and could be omitted, but specifying it explicitly is harmless and arguably clearer.
- `stub no;` in the multi-area example is the default value for non-backbone areas, so it's redundant but valid.
- The OSPF `dead count 4;` (with `hello 10;`) yields a 40-second dead interval, which is the OSPF default — valid.
- The route filter `if net ~ [ 2001:db8::/32+ ] then accept;` correctly uses the `+` prefix-pattern operator to match `2001:db8::/32` and any longer prefix within it.
- Modern Linux distributions use predictable interface names (e.g., `enp0s3`); the post uses legacy `eth0`/`eth1` for clarity, which is fine for tutorial purposes.
