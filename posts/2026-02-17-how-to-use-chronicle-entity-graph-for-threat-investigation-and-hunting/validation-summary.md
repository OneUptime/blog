# Validation Summary: How to Use Chronicle Entity Graph for Threat Investigation and Hunting

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Google Security Operations / Chronicle SIEM
- Entity Context Graph
- UDM search and entity context
- YARA-L detection rules
- Chronicle SOAR cases

## Sources Consulted
- Google Cloud documentation: Using the Entity Context Graph (ECG) - https://docs.cloud.google.com/chronicle/docs/event-processing/entity-graph
- Google Cloud documentation: Conduct a search for entity context data - https://docs.cloud.google.com/chronicle/docs/investigation/entity-context-in-search
- Google Cloud documentation: Graph REST resource - https://cloud.google.com/chronicle/docs/reference/rest/v1alpha/Graph
- Google Cloud documentation: findingsGraph.exploreNode REST method - https://docs.cloud.google.com/chronicle/docs/reference/rest/v1alpha/projects.locations.instances.findingsGraph/exploreNode
- Google Cloud documentation: Prevalence REST resource - https://cloud.google.com/chronicle/docs/reference/rest/v1alpha/Prevalence
- Google Cloud documentation: Investigate entities and alerts - https://docs.cloud.google.com/chronicle/docs/soar/investigate/working-with-cases/explore-entities-and-alerts-investigation

## Issues Found
- The post said the Entity Graph is built from all UDM events and that every event creates relationships. Google documentation describes the Entity Context Graph as a data model that uses UDM events, entity context, derived context, and global context, with specific UDM fields acting as stable identifiers and relationship indicators. Updated the explanation to avoid implying every UDM event always creates an edge.
- The post said opening the graph queries a pre-built graph instead of scanning raw events, making it fast across months of data. Official documentation supports ECG use in rules, search, dashboards, and investigation views, but also documents a five-day look-back window for creating entity-context data. Reworded the claim to avoid unsupported retention/performance guarantees and to recommend UDM search for raw event details.
- The post said prevalence is shown across the local environment and all Chronicle customers. Official prevalence documentation defines prevalence within the customer's environment. Updated the claim to customer-environment prevalence and clarified that low prevalence is an investigative lead, not proof of maliciousness.
- The post described exporting graph snapshots, pushing findings directly to SOAR cases, and generating IOC lists as graph outputs. I could not verify those graph-specific export actions in official documentation, so I replaced them with supported, general actions: document findings in cases, preserve indicators in cases/reference lists/data tables, create YARA-L rules, and use UDM search for evidence.

## Review Notes
The post is a conceptual investigation guide and does not include executable code or commands. The Mermaid diagram is illustrative and syntactically valid for the simple graph shown. Some UI labels and available actions can vary between legacy Chronicle, unified Google SecOps, and SOAR views, so future updates should align screenshots or workflow steps with the specific product experience being documented.
