# Validation summary

Reviewed release-specific prerequisites, conversion confirmation, coordinated backup, agent convergence and restoration across incompatible data formats. The article retains controlled test traffic before normal writers resume.

## Checks performed

- Two shell command examples passed sh -n and were reviewed against official startup documentation
- Upgrade boundaries, runtime transition, agent update behavior and rollback route reviewed against official TeamCity guidance
- Mermaid structurally checked: eight nodes and seven edges
- Generated social image visually reviewed

## Limitations

- No server stopped, upgraded, started or restored; no live agent update or build acceptance run
- Commands are illustrative Linux archive-installation operations with placeholder path
- Java transition example is specifically the documented 2026.1 transition, not a universal requirement for older releases
- Single-server procedure; multi-node upgrade needs release-specific instructions
- Mermaid was not rendered

## Sources reviewed

- https://www.jetbrains.com/help/teamcity/upgrade-notes.html
- https://www.jetbrains.com/help/teamcity/supported-platforms-and-environments.html
- https://www.jetbrains.com/help/teamcity/upgrading-teamcity-server-and-agents.html
- https://www.jetbrains.com/help/teamcity/how-to.html#Copied+Server+Checklist
- https://www.jetbrains.com/help/teamcity/teamcity-maintenance-mode.html
- https://www.jetbrains.com/help/teamcity/start-teamcity-server.html
- https://www.jetbrains.com/help/teamcity/teamcity-data-backup.html
- https://www.jetbrains.com/help/teamcity/upgrading-teamcity-server-and-agents.html#Automatic+Build+Agents+Update
- https://www.jetbrains.com/help/teamcity/restoring-teamcity-data-from-backup.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
