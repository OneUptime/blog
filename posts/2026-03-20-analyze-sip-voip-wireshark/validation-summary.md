# Validation Summary: How to Analyze SIP and VoIP Traffic with Wireshark

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wireshark
- SIP
- RTP
- VoIP
- `tcpdump`
- Wireshark display filters

## Sources Consulted
- Wireshark User’s Guide, Following Protocol Streams: https://www.wireshark.org/docs/wsug_html_chunked/ChAdvFollowStreamSection.html
- Wireshark User’s Guide, VoIP Calls Window: https://www.wireshark.org/docs/wsug_html_chunked/ChTelVoipCalls.html
- Wireshark User’s Guide, RTP: https://www.wireshark.org/docs/wsug_html_chunked/ChTelRTP.html
- Wireshark User’s Guide, Playing VoIP Calls / RTP Decoding Settings: https://www.wireshark.org/docs/wsug_html_chunked/ChTelPlayingCalls.html
- Wireshark Display Filter Reference, SIP: https://www.wireshark.org/docs/dfref/s/sip.html
- Wireshark Display Filter Reference, RTP: https://www.wireshark.org/docs/dfref/r/rtp.html
- Wireshark filter syntax reference: https://www.wireshark.org/docs/man-pages/wireshark-filter
- RFC 3261, SIP: Session Initiation Protocol: https://www.rfc-editor.org/rfc/rfc3261
- RFC 3550, RTP: A Transport Protocol for Real-Time Applications: https://www.rfc-editor.org/rfc/rfc3550
- RFC 3551, RTP Profile for Audio and Video Conferences with Minimal Control: https://www.rfc-editor.org/rfc/rfc3551
- IANA RTP Parameters registry: https://www.iana.org/assignments/rtp-parameters/rtp-parameters.xhtml
- Local `tcpdump` 4.99.4 output (`tcpdump -d`) to verify the capture filter expression compiled successfully

## Issues Found
- The SIP dialog section instructed readers to use **Follow** → **UDP Stream**. Wireshark’s documented SIP-aware workflow is **Follow** → **SIP Call**, which filters by `sip.Call-ID` rather than only following one transport stream. I updated that step accordingly.
- The sentence about **Telephony** → **SIP Flows** implied that opening the window itself produces a ladder diagram. Wireshark documents `SIP Flows` as a list view with the same features as `VoIP Calls`; the ladder diagram is opened via **Flow Sequence**. I corrected that instruction.
- The RTP payload example described payload type `0` as generic `G.711`. RFC 3551 and the IANA RTP registry assign payload type `0` specifically to `PCMU` (G.711 mu-law). I updated the wording to be precise.
- The post described `403 Forbidden` as an authentication failure. RFC 3261 defines `403` as a request the server understood but refused; authentication challenges are `401 Unauthorized` or `407 Proxy Authentication Required`. I corrected the description and tightened the `408 Request Timeout` wording to match the RFC more closely.
- The capture/filter wording implied a fixed RTP range and that `rtp` shows all RTP traffic. Wireshark’s documentation notes that RTP usually uses dynamic UDP ports and that Wireshark only matches `rtp` after decoding the traffic as RTP, typically from captured signaling such as SIP/SDP. I updated the wording to say the port range is a common example and that the filter shows decoded RTP.
- The playback wording implied unconditional audio replay. Wireshark’s RTP Player capabilities depend on codec support, so I changed the text to say playback works for supported RTP audio.

## Review Notes
- The `tcpdump` capture filter in the post is syntactically valid; it compiled successfully with local `tcpdump` 4.99.4.
- `wireshark` and `tshark` are not installed in this environment, so UI paths and display-field names were validated against Wireshark’s official documentation instead of local binaries.
- The post remains accurate for unencrypted SIP/RTP analysis. Encrypted deployments such as SIP over TLS (`5061`) or SRTP would require additional capture and decryption guidance, which is outside the current post’s scope.
