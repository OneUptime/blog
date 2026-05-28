# Validation Summary: How to Design Row Keys in Cloud Bigtable to Avoid Hotspots

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Bigtable
- Bigtable row key/schema design
- Bigtable Key Visualizer and hot tablets
- Python row key generation examples
- Google Cloud CLI

## Sources Consulted
- Google Cloud Bigtable schema design: https://cloud.google.com/bigtable/docs/schema-design
- Google Cloud Bigtable Key Visualizer overview: https://cloud.google.com/bigtable/docs/keyvis-overview
- Google Cloud Bigtable hot tablets: https://cloud.google.com/bigtable/docs/hot-tablets
- Google Cloud CLI `gcloud bigtable hot-tablets list` reference: https://cloud.google.com/sdk/gcloud/reference/bigtable/hot-tablets/list
- Python `hashlib` documentation: https://docs.python.org/3/library/hashlib.html

## Issues Found
- The reverse timestamp example claimed distribution from the reverse timestamp itself and showed values that did not sort newest-first. Updated the comment, zero-padded the reversed timestamp, corrected the example values, and clarified that distribution comes from the high-cardinality sensor prefix.
- The hash-prefix example showed different MD5 prefixes for the same entity ID, which did not match the code. Updated the sample row keys so the same entity keeps the same prefix.
- The hash-prefix guidance said it forces even distribution across all tablets. Updated the wording to say it helps spread writes across key ranges and noted the tradeoff with natural-key scans.
- The salting example used Python's built-in `hash()`, which is not stable across interpreter processes by default. Replaced it with a deterministic `hashlib.md5()`-based salt.
- The `gcloud bigtable instances list` command was described as a way to check individual node load, but it lists instances rather than hot tablets or node load. Replaced it with the documented `gcloud bigtable hot-tablets list CLUSTER_ID --instance=INSTANCE_ID` command.

## Review Notes
The post is technically relevant and broadly aligned with Bigtable row-key design guidance. Future improvements could mention that Google recommends avoiding hashed row key values when possible because they can make Key Visualizer analysis and range scans harder, but the current hash-prefix section now frames the tradeoff accurately.
