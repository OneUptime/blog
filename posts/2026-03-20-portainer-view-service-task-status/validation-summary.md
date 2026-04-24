# Validation Summary: How to View Service Task Status in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Swarm
- Docker CLI
- Swarm service tasks

## Sources Consulted
- Portainer docs: https://docs.portainer.io/sts/user/docker/services/tasks
- Portainer docs: https://docs.portainer.io/sts/user/docker/containers/view
- Docker docs: https://docs.docker.com/engine/swarm/how-swarm-mode-works/swarm-task-states/
- Docker docs: https://docs.docker.com/reference/cli/docker/service/ps/
- Docker docs: https://docs.docker.com/reference/cli/docker/service/logs/
- Docker docs: https://docs.docker.com/reference/cli/docker/inspect/
- Docker docs: https://docs.docker.com/reference/cli/docker/node/rm/
- Docker docs: https://docs.docker.com/reference/cli/docker/swarm/update/
- Portainer source: https://github.com/portainer/portainer/blob/develop/app/react/docker/services/ItemView/TasksDatatable/columns/task.tsx
- Portainer source: https://github.com/portainer/portainer/blob/develop/app/react/docker/services/ItemView/TasksDatatable/columns/status.tsx
- Portainer source: https://github.com/portainer/portainer/blob/develop/app/react/docker/services/ItemView/TasksDatatable/columns/actions.tsx

## Issues Found
- The task-table column list was inaccurate. The current Portainer task table exposes `Status`, `Id`, `Actions`, `Slot`, `Node`, and `Last Update`; it does not show an `Image` column in this view. I corrected the table description accordingly.
- The task-state section was incomplete and one definition was wrong. Docker documents additional valid task states such as `new`, `assigned`, `accepted`, `ready`, `preparing`, and `remove`, and `running` means the task is executing, not that it is necessarily healthy. I replaced the list with the official state set and corrected the meanings.
- The post claimed Portainer had filter options for showing only current tasks and filtering by node in this task view. Current Portainer behavior supports a state filter on the task table and general search, but not the specific history/node filters described. I updated that section to match the verified UI.
- The `docker service ps --filter desired-state=failed` example was invalid. Docker only supports `desired-state` values of `running`, `shutdown`, and `accepted`. I changed the example to `desired-state=shutdown` and adjusted the wording to describe historical tasks, including failed ones.
- The failed-task troubleshooting commands were too broad and imprecise. `docker service logs` accepts a task ID directly, and `docker inspect` should explicitly target a task object when inspecting task metadata. I updated those examples to use task-scoped commands and `--type task`.
- The `pending` troubleshooting section listed image-pull problems as a common cause. Docker task lifecycle docs and `docker service ps` examples show image-pull failures surfacing as rejected or failed task attempts rather than a stable `pending` explanation. I replaced that bullet with node availability issues.
- The task-click behavior was overstated. In Portainer agent-backed environments, clicking a task can take you to the backing container details page with logs, stats, console, and inspect actions; without an agent-backed environment, Portainer exposes task inspect/logs views instead. I clarified that distinction.

## Review Notes
- Portainer shows the task history that Docker Swarm retains. Docker documents a swarm task history retention limit, with a default of `5`, configurable via `docker swarm update --task-history-limit`.
