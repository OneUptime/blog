# Validation Summary: How to Export IPv4 Packet Data to CSV Using PyShark

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- PyShark
- Wireshark
- TShark
- IPv4
- Python
- CSV
- pandas

## Sources Consulted
- PyShark repository README: https://github.com/KimiNewt/pyshark
- PyShark `LiveCapture` source: https://github.com/KimiNewt/pyshark/blob/master/src/pyshark/capture/live_capture.py
- Wireshark display filter manual: https://www.wireshark.org/docs/man-pages/wireshark-filter
- TShark manual: https://www.wireshark.org/docs/man-pages/tshark.html
- Homebrew `wireshark` formula: https://formulae.brew.sh/formula/wireshark
- Grafana data sources documentation: https://grafana.com/docs/grafana/latest/datasources/
- Grafana CSV via Infinity data source: https://grafana.com/docs/learning-journeys/infinity-csv/

## Issues Found
- The live capture example used `getattr(pkt.tcp, ...)` with a UDP fallback, but `pkt.tcp` is evaluated before `getattr` can use the fallback. On UDP packets without a TCP layer, that raises `AttributeError` and skips the packet. I changed the snippet to detect TCP and UDP layers explicitly before assigning port fields.
- The pandas example imported `matplotlib.pyplot` even though the post never uses it and the prerequisites only install `pyshark` and `pandas`. I removed the unused import so the snippet matches the stated dependencies.
- The conclusion said the CSV output integrates directly with Grafana. Current Grafana documentation routes CSV usage through data sources or plugins rather than native direct CSV support, so I reworded that line to avoid overstating direct integration.

## Review Notes
- The post is technically relevant and contains working code after the fixes above.
- PyShark depends on an installed `tshark` binary, which the post correctly states.
- Wireshark documents that display filters are valid for both reading capture files and live capture, but `tshark` notes they are less efficient than capture filters during live capture and may increase packet loss on busy interfaces.
