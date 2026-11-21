# Validation summary

Reviewed official mirror/source, super-cluster, leaf-node and external-stream documentation plus pinned Python API definitions. Newer ADR features are not assumed available in the pinned runtime.

## Executed checks

All published Python fragments ran in an async wrapper against NATS Server 2.11.4 with nats-py 2.10.0. Separate EAST/WEST domains communicated over a local leaf link. Mirror data, sequence numbers and timestamps matched; the aggregate combined both sources. After stopping and restarting WEST with its original store, the destinations caught up with the record published during downtime. Servers and temporary stores were cleaned up.

The eight-edge Mermaid structure passed. The generated 1280x720 social image was visually reviewed and is readable.

## Limits

No real WAN, gateways, TLS, account restrictions, multi-replica failures or production promotion were tested. Relative store paths in the article were mapped to temporary absolute paths in the harness. No deletion/retention or consumer migration behavior was tested. Mermaid was not graphically rendered. Sources and exact observations are recorded in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
