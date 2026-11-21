# Validation review

Reviewed JDK17 G1/launcher/JFR documentation and pinned OpenJDK17.0.16+8 threshold and event metadata. Compiled and ran companion BufferLab on installed Zulu17.0.16+8:700KiB arrays produced humongous-region counts up to59, split128KiB/60KiB chunks produced0. Both used64MiB heap and1MiB regions. The large run had a profile recording with60 allocation samples; jfr print resolved the allocation stack. Runs are not a controlled performance comparison because recording differed.

Seven-node seven-edge Mermaid structurally checked;1280x720 image visually inspected. No production fragmentation, latency benchmark, region-size tuning or heap dump. Sample weight semantics explicitly distinguished from object size. Mermaid not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
