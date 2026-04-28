# Validation Summary: How to Use networksetup for IPv6 Configuration on macOS

## Status
validated

## Post Type
Reference / Cheat sheet

## Technologies Covered
- macOS `networksetup` CLI utility
- IPv6 (SLAAC, DHCPv6, link-local, manual addressing)
- DNS configuration (IPv4 and IPv6 resolvers)
- Network service / hardware port management on macOS
- Bash scripting (associative-style case dispatch, while-read loop)

## Sources Consulted
- macOS `networksetup(8)` man page mirror — [manp.gs/mac/8/networksetup](https://manp.gs/mac/8/networksetup)
- SS64 networksetup reference — [ss64.com/mac/networksetup.html](https://ss64.com/mac/networksetup.html)
- Apple Support: "Use IPv6 on Mac" — [support.apple.com/guide/mac-help/use-ipv6-on-mac-mchlp2499/mac](https://support.apple.com/guide/mac-help/use-ipv6-on-mac-mchlp2499/mac)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) — confirms `2001:db8::/32` is appropriate for example addresses
- Google Public DNS docs — confirms `2001:4860:4860::8888` / `::8844` and `8.8.8.8` resolver addresses

## Issues Found
1. **Non-existent command `-getv6additional`** (in the IPv6 Address Configuration Commands section, and again in the Summary). The macOS `networksetup` utility has no such subcommand. The actual command is `-getv6additionalroutes`, which displays additional IPv6 routes configured for a service — it does **not** display the current IPv6 configuration as the original comment claimed. Fix: replaced `-getv6additional` with `-getv6additionalroutes` and corrected the comment to "Display additional IPv6 routes configured for the service". Updated the Summary's bullet entry accordingly and added a note that `-getinfo` (already shown elsewhere in the post) is what one uses to view the current IPv6 configuration.
2. **Misleading comment on `-getairportnetwork`**. The original section header read "Get the hardware device name for a service", but `networksetup -getairportnetwork en0` returns the current Wi-Fi SSID, not a hardware device name. Fix: updated the comment to "Get current Wi-Fi network (SSID) for a Wi-Fi device" and clarified the inline comment to note it returns the SSID. The companion `-listallhardwareports` inline comment was tightened to "Map service names to devices" since that more accurately describes its output (Hardware Port → Device mapping).

## Review Notes
- All other commands verified against the official `networksetup(8)` man page: `-listallnetworkservices`, `-listallhardwareports`, `-setv6automatic`, `-setv6linklocal`, `-setv6manual <service> <address> <prefixlength> <router>`, `-setv6off`, `-setdnsservers` (incl. the `"empty"` sentinel to clear), `-getdnsservers`, `-setsearchdomains`, `-getsearchdomains`, `-getinfo`, `-getsocksfirewallproxy`, `-setnetworkserviceenabled`, `-getnetworkserviceenabled`, `-getairportnetwork`. All flag spellings, argument orders, and example values are correct.
- Example IPv6 addresses (`2001:db8::10`, `2001:db8::1234:5678`) correctly use the `2001:db8::/32` documentation prefix per RFC 3849.
- The script's `tail -n +2` correctly skips the literal first-line header ("An asterisk (*) denotes that a network service is disabled."), and the `[[ "$svc" == \** ]]` glob correctly matches the disabled-service marker — both bash patterns are valid.
- The `-getinfo` example output is abbreviated (real output also includes IPv4 fields and a Wi-Fi/Ethernet ID line), but truncated example output is reasonable for a reference and is not technically incorrect.
- Device-name assumptions (Wi-Fi = `en0`, Ethernet = `en1`) vary by Mac hardware and adapter order; readers on Mac Pro / iMac / Mac mini with built-in Ethernet may see the reverse mapping. The post's `-listallhardwareports` instruction correctly tells readers to look up the actual mapping themselves.
- Note for future updates: `networksetup` has been stable across recent macOS releases (Big Sur through Sequoia/Tahoe), but Apple has been gradually steering users toward System Settings GUI; if Apple ever deprecates `networksetup`, several sections of this post would need revision.
