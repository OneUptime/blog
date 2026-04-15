# How to Checkpoint and Resume AI Agent Execution in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Agent, Checkpoint, Resume, Reliability

Description: Learn how to implement checkpoint and resume patterns for AI agent execution in Dapr, enabling long-running agents to survive restarts and continue from saved state.

---

## The Problem with Long-Running AI Agents

AI agents that process large datasets, run complex multi-step tasks, or operate over extended periods face a common challenge: process restarts erase in-memory state. Without checkpointing, a 2-hour data analysis that crashes at step 50 of 100 must restart from the beginning.

Dapr solves this through two mechanisms:
1. **Dapr Actors** - virtual actors maintain state across restarts automatically
2. **Dapr Workflows** - checkpoint state after each activity

## Checkpointing with Dapr Actors

Use Dapr's actor model to build a stateful agent that checkpoints automatically:

```python
from dapr.actor import Actor, ActorInterface, actormethod
from dapr_agents.llm import OpenAIChatClient
from dataclasses import dataclass, asdict
import json

@dataclass
class AgentState:
    task_id: str
    current_step: int
    total_steps: int
    completed_steps: list
    final_result: str = None


class ResumableAgentInterface(ActorInterface):
    @actormethod(name="StartTask")
    async def start_task(self, task: dict) -> None: ...

    @actormethod(name="GetStatus")
    async def get_status(self) -> dict: ...


class ResumableAgent(Actor, ResumableAgentInterface):
    def __init__(self, ctx, actor_id):
        super().__init__(ctx, actor_id)
        self.llm = OpenAIChatClient(model="gpt-4o")

    async def _on_activate(self) -> None:
        # Load saved state on activation (or create fresh state)
        state = await self._state_manager.try_get_state("agent_state")
        if not state[0]:
            await self._state_manager.set_state("agent_state", {
                "current_step": 0,
                "completed_steps": [],
                "final_result": None
            })

    async def start_task(self, task: dict) -> None:
        state = (await self._state_manager.get_state("agent_state"))
        steps = task.get("steps", [])

        for i, step in enumerate(steps[state["current_step"]:], state["current_step"]):
            # Run LLM step
            result = self.llm.generate(step["prompt"])

            # Save checkpoint after each step
            state["completed_steps"].append({
                "step": i,
                "prompt": step["prompt"],
                "result": result.get_message().content
            })
            state["current_step"] = i + 1
            await self._state_manager.set_state("agent_state", state)
            await self._state_manager.save_state()

        state["final_result"] = "All steps completed"
        await self._state_manager.set_state("agent_state", state)
        await self._state_manager.save_state()

    async def get_status(self) -> dict:
        return await self._state_manager.get_state("agent_state")
```

## Registering and Invoking the Actor

```python
# app.py
import asyncio
from datetime import timedelta
from dapr.actor.runtime.runtime import ActorRuntime
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorTypeConfig

async def setup():
    ActorRuntime.set_actor_config(
        ActorRuntimeConfig(
            actor_idle_timeout=timedelta(hours=1),
            actor_scan_interval=timedelta(seconds=30),
            actor_type_configs=[
                ActorTypeConfig(actor_type="ResumableAgent")
            ]
        )
    )

    await ActorRuntime.register_actor(ResumableAgent)

asyncio.run(setup())

# Keep the server running
asyncio.get_event_loop().run_forever()
```

Invoke the actor:

```python
from dapr.actor import ActorProxy, ActorId

async def run_resumable_task():
    proxy = ActorProxy.create(
        "ResumableAgent",
        ActorId("task-123"),
        ResumableAgentInterface
    )

    await proxy.StartTask({
        "steps": [
            {"prompt": "Summarize section 1 of the document"},
            {"prompt": "Summarize section 2 of the document"},
            {"prompt": "Create an executive summary from all sections"}
        ]
    })
```

## Manual Checkpoint via State Store

For agents that are not actors, use the Dapr state API directly:

```python
from dapr.clients import DaprClient
import json

class CheckpointableAgent:
    def __init__(self, task_id: str):
        self.task_id = task_id
        self.client = DaprClient()
        self.state = self._load_checkpoint()

    def _load_checkpoint(self) -> dict:
        result = self.client.get_state("statestore", f"agent-{self.task_id}")
        if result.data:
            return json.loads(result.data)
        return {"step": 0, "results": []}

    def _save_checkpoint(self):
        self.client.save_state("statestore", f"agent-{self.task_id}",
                               json.dumps(self.state))

    def run_steps(self, steps: list):
        start = self.state["step"]
        for i, step in enumerate(steps[start:], start):
            result = self._process_step(step)
            self.state["results"].append(result)
            self.state["step"] = i + 1
            self._save_checkpoint()  # Checkpoint after each step
```

## Resuming After Restart

When the process restarts, the checkpoint is loaded and work resumes:

```bash
# Process crashes at step 25 of 100
# On restart:
dapr run --app-id resumable-agent \
  --components-path ./components \
  -- python agent.py --task-id task-123
# Agent loads checkpoint: step=25, resumes from step 26
```

## Summary

Dapr provides two checkpointing patterns for AI agents: virtual actors that automatically persist state on each state manager save, and manual checkpointing via the Dapr state API. Actors are ideal for long-running tasks with many small steps, while manual checkpointing works for simpler linear pipelines. Both patterns ensure that expensive LLM calls are not repeated after process restarts.
