# How to Configure Agent Memory with Vertex AI Agent Engine Sessions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Agent Engine, Session, Memory Bank

Description: Configure persistent memory for AI agents using Vertex AI Agent Engine sessions and memory bank to enable context-aware multi-turn conversations.

---

An AI agent that forgets everything between messages is frustrating to use. Users expect agents to remember what was discussed, retain preferences, and build on previous interactions. Vertex AI Agent Engine provides two memory mechanisms through Agent Platform: sessions for short-term conversation context and Memory Bank for long-term persistent storage. Understanding how to configure both gives your agent the ability to maintain context within a conversation and recall important information across conversations.

This guide covers setting up and using both memory systems effectively.

## Sessions vs. Memory Bank

These two memory types serve different purposes:

**Sessions** handle short-term, within-conversation memory. When a user starts a chat, a session is created. The session stores the conversation history - every message exchanged between the user and the agent during that interaction. When the conversation ends, the session can be retained for reference or discarded.

**Memory Bank** handles long-term, cross-conversation memory. It stores persistent facts about users, preferences, and important details that should carry over between separate conversations. If a user tells the agent "I prefer responses in Spanish" in one session, Memory Bank can make that preference available in future sessions after you generate memories from the session or store the fact directly.

```mermaid
graph TD
    A[User Starts Chat] --> B[Session Created]
    B --> C[Conversation Messages]
    C --> D[Short-term Memory - Session]
    C --> E[Important Facts Extracted]
    E --> F[Long-term Memory - Memory Bank]

    G[User Returns Later] --> H[New Session Created]
    F -->|Load user preferences| H
    H --> I[Context-Aware Conversation]
```

## Prerequisites

- Google Cloud project with the Agent Platform API enabled
- Python 3.10+

```bash
pip install "google-cloud-aiplatform>=1.111.0" langchain-google-vertexai
```

## Working with Sessions

### Creating and Managing Sessions

```python
from datetime import datetime, timezone
import uuid
import vertexai

class SessionManager:
    """Manage Agent Platform sessions for the AI agent."""

    def __init__(self, project_id: str, location: str, agent_engine_name: str = None):
        self.client = vertexai.Client(project=project_id, location=location)
        if agent_engine_name:
            self.agent_engine_name = agent_engine_name
        else:
            agent_engine = self.client.agent_engines.create()
            self.agent_engine_name = agent_engine.api_resource.name

    def create_session(self, user_id: str, ttl_days: int = 30) -> str:
        """Create a new conversation session for a user."""
        session = self.client.agent_engines.sessions.create(
            name=self.agent_engine_name,
            user_id=user_id,
            config={"ttl": f"{ttl_days * 24 * 60 * 60}s"},
        )
        print(f"Created session {session.response.name} for user {user_id}")
        return session.response.name

    def add_message(self, session_id: str, role: str, content: str):
        """Add a message to the session history."""
        content_role = "user" if role == "user" else "model"
        self.client.agent_engines.sessions.events.append(
            name=session_id,
            author=role,
            invocation_id=self._get_invocation_id(),
            timestamp=datetime.now(tz=timezone.utc),
            config={
                "content": {
                    "role": content_role,
                    "parts": [{"text": content}],
                }
            },
        )

    def get_history(self, session_id: str, max_messages: int = 20) -> list:
        """Get the conversation history for a session, limited to recent messages."""
        events = list(self.client.agent_engines.list_session_events(name=session_id))
        messages = []
        for event in events:
            content = getattr(event, "content", None)
            if not content or not getattr(content, "parts", None):
                continue
            text = "".join(getattr(part, "text", "") for part in content.parts)
            messages.append({
                "role": "user" if content.role == "user" else "agent",
                "content": text,
            })
        # Return the most recent messages to stay within context limits
        return messages[-max_messages:]

    def close_session(self, session_id: str):
        """Delete a session and its child events."""
        self.client.agent_engines.sessions.delete(name=session_id)
        print(f"Deleted session {session_id}")

    def _get_invocation_id(self):
        return str(uuid.uuid4())

# Usage
session_mgr = SessionManager("your-project-id", "us-central1")
session_id = session_mgr.create_session("user-123")
session_mgr.add_message(session_id, "user", "What is my account balance?")
session_mgr.add_message(session_id, "agent", "Your current balance is $1,234.56.")
```

### Integrating Sessions with the Agent

```python
from langchain_google_vertexai import ChatVertexAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage

class ConversationalAgent:
    """An agent that uses session memory for context-aware conversations."""

    def __init__(self, project_id: str, location: str):
        self.llm = ChatVertexAI(
            model_name="gemini-2.5-pro",
            project=project_id,
            location=location,
            temperature=0.3,
        )

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a helpful customer support agent.
            Use the conversation history to maintain context.
            If the user references something from earlier in the conversation,
            use that context to provide relevant answers."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])

        self.chain = self.prompt | self.llm
        self.session_mgr = SessionManager(project_id, location)

    def chat(self, user_id: str, session_id: str, message: str) -> str:
        """Process a user message within a session context."""
        # Record the user message
        self.session_mgr.add_message(session_id, "user", message)

        # Get conversation history
        history = self.session_mgr.get_history(session_id)

        # Convert history to LangChain message format
        langchain_history = []
        for msg in history[:-1]:  # Exclude the current message
            if msg["role"] == "user":
                langchain_history.append(HumanMessage(content=msg["content"]))
            else:
                langchain_history.append(AIMessage(content=msg["content"]))

        # Generate response
        response = self.chain.invoke({
            "history": langchain_history,
            "input": message,
        })

        agent_response = response.content

        # Record the agent response
        self.session_mgr.add_message(session_id, "agent", agent_response)

        return agent_response

# Usage
agent = ConversationalAgent("your-project-id", "us-central1")
session_id = agent.session_mgr.create_session("user-456")

print(agent.chat("user-456", session_id, "I ordered a laptop last week"))
print(agent.chat("user-456", session_id, "Has it shipped yet?"))
# The agent knows "it" refers to the laptop from the previous message
```

## Working with Memory Bank

### Building a Persistent Memory Store

The memory bank stores long-term facts about users that persist across conversations.

```python
import vertexai

class MemoryBank:
    """Long-term memory storage for AI agent using Agent Platform Memory Bank."""

    def __init__(self, project_id: str, location: str, agent_engine_name: str = None):
        self.client = vertexai.Client(project=project_id, location=location)
        if agent_engine_name:
            self.agent_engine_name = agent_engine_name
        else:
            agent_engine = self.client.agent_engines.create()
            self.agent_engine_name = agent_engine.api_resource.name

    def store_memory(self, user_id: str, fact: str):
        """Store a persistent memory about a user."""
        memory = self.client.agent_engines.memories.create(
            name=self.agent_engine_name,
            fact=fact,
            scope={"user_id": user_id},
        )

        print(f"Stored memory for {user_id}: {fact}")
        return memory.response.name

    def generate_memories_from_session(self, user_id: str, session_id: str):
        """Extract and consolidate memories from an Agent Platform session."""
        self.client.agent_engines.memories.generate(
            name=self.agent_engine_name,
            vertex_session_source={"session": session_id},
            scope={"user_id": user_id},
        )

    def get_memories(self, user_id: str) -> list:
        """Retrieve all memories for a user."""
        memories = self.client.agent_engines.memories.retrieve(
            name=self.agent_engine_name,
            scope={"user_id": user_id},
        )
        return [retrieved.memory for retrieved in memories]

    def delete_memory(self, memory_name: str):
        """Delete a specific memory by resource name."""
        self.client.agent_engines.memories.delete(
            name=memory_name,
            config={"wait_for_completion": True},
        )
        print(f"Deleted memory {memory_name}")

    def format_memories_for_prompt(self, user_id: str) -> str:
        """Format all memories into a string for inclusion in the agent prompt."""
        memories = self.get_memories(user_id)
        if not memories:
            return "No prior information about this user."

        formatted = []
        for memory in memories:
            formatted.append(f"- {memory.fact}")

        return "Known information about this user:\n" + "\n".join(formatted)
```

### Integrating Memory Bank with the Agent

```python
class MemoryAwareAgent:
    """An agent that uses both session memory and long-term memory bank."""

    def __init__(self, project_id: str, location: str):
        self.llm = ChatVertexAI(
            model_name="gemini-2.5-pro",
            project=project_id,
            location=location,
            temperature=0.3,
        )

        self.session_mgr = SessionManager(project_id, location)
        self.memory_bank = MemoryBank(
            project_id,
            location,
            agent_engine_name=self.session_mgr.agent_engine_name,
        )

    def chat(self, user_id: str, session_id: str, message: str) -> str:
        """Chat with full memory context - both session and long-term."""
        # Load long-term memories for this user
        user_memories = self.memory_bank.format_memories_for_prompt(user_id)

        # Get session history
        history = self.session_mgr.get_history(session_id)
        self.session_mgr.add_message(session_id, "user", message)

        # Build prompt with both memory types
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are a helpful assistant with memory of past interactions.

{user_memories}

Use this information to personalize your responses. If the user shares new
preferences or important information, mention that you will remember it."""),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}"),
        ])

        chain = prompt | self.llm

        langchain_history = []
        for msg in history:
            if msg["role"] == "user":
                langchain_history.append(HumanMessage(content=msg["content"]))
            else:
                langchain_history.append(AIMessage(content=msg["content"]))

        response = chain.invoke({
            "history": langchain_history,
            "input": message,
        })

        agent_response = response.content
        self.session_mgr.add_message(session_id, "agent", agent_response)

        return agent_response

    def remember(self, user_id: str, fact: str):
        """Explicitly store a long-term memory about the user."""
        self.memory_bank.store_memory(user_id, fact)

# Usage
agent = MemoryAwareAgent("your-project-id", "us-central1")

# Store some long-term memories
agent.remember("user-789", "The user prefers responses in English.")
agent.remember("user-789", "The user is on the Professional plan.")
agent.remember("user-789", "The user works for Acme Corp.")

# Start a new conversation - the agent already knows about the user
session_id = agent.session_mgr.create_session("user-789")
print(agent.chat("user-789", session_id, "Can you help me upgrade my plan?"))
# The agent knows they are on the Professional plan and works for Acme Corp
```

## Memory Architecture

```mermaid
graph TD
    A[User Message] --> B[Agent]
    B --> C[Load Session History]
    B --> D[Load Memory Bank]
    C --> E[Short-term Context]
    D --> F[Long-term Context]
    E --> G[Combined Prompt]
    F --> G
    G --> H[Gemini Model]
    H --> I[Response]
    I --> J[Update Session]
    I --> K{New fact learned?}
    K -->|Yes| L[Update Memory Bank]
    K -->|No| M[Done]
```

## Summary

Configuring memory properly is what separates a basic chatbot from a useful AI agent. Sessions give you within-conversation context so the agent tracks what is being discussed. The Memory Bank gives you cross-conversation persistence so the agent remembers important facts about each user. Combine both in your agent prompt, and you get an experience that feels personal and context-aware. Use Agent Platform Memory Bank for persistent facts, keep session histories trimmed to manage token costs, and be intentional about what gets stored in long-term memory versus what is transient.
