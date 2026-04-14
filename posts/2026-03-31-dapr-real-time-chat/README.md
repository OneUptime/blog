# How to Build a Real-Time Chat Application with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Chat, Pub/Sub, WebSocket, Real-Time

Description: Learn how to build a real-time chat application using Dapr pub/sub for message delivery and state management for chat history and presence tracking.

---

## Overview

A real-time chat application requires message delivery across multiple service instances, presence tracking, and message history. Dapr's pub/sub and state building blocks provide the infrastructure for reliable message routing and persistence.

## Architecture

```text
WebSocket Server (multiple replicas)
  |-- Dapr Pub/Sub --> message delivery across instances
  |-- Dapr State   --> message history, user presence
  |-- Dapr Actors  --> per-user session management
```

## Message Model

```go
package main

type ChatMessage struct {
    ID        string `json:"id"`
    RoomID    string `json:"roomId"`
    UserID    string `json:"userId"`
    Username  string `json:"username"`
    Content   string `json:"content"`
    Timestamp int64  `json:"timestamp"`
    Type      string `json:"type"` // "text", "image", "system"
}

type UserPresence struct {
    UserID    string `json:"userId"`
    Username  string `json:"username"`
    RoomID    string `json:"roomId"`
    Online    bool   `json:"online"`
    LastSeen  int64  `json:"lastSeen"`
}
```

## WebSocket Handler with Dapr Pub/Sub

```go
type ChatServer struct {
    daprClient  dapr.Client
    connections sync.Map // userID -> websocket.Conn
}

func (s *ChatServer) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
    userID := r.URL.Query().Get("userId")
    roomID := r.URL.Query().Get("roomId")

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }
    defer conn.Close()

    // Track connection
    s.connections.Store(userID, conn)
    defer s.connections.Delete(userID)

    // Mark user online
    s.setPresence(userID, roomID, true)

    // Handle incoming messages
    for {
        _, msgBytes, err := conn.ReadMessage()
        if err != nil {
            break
        }

        var msg ChatMessage
        json.Unmarshal(msgBytes, &msg)
        msg.ID = uuid.New().String()
        msg.Timestamp = time.Now().Unix()

        // Save to history
        s.saveMessage(msg)

        // Publish to all subscribers (other server instances)
        s.daprClient.PublishEvent(
            context.Background(),
            "pubsub",
            "room:"+roomID,
            msg,
        )
    }

    s.setPresence(userID, roomID, false)
}
```

## Receiving Messages from Pub/Sub

```go
// Dapr delivers messages published to room topics
func (s *ChatServer) HandleRoomMessage(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var msg ChatMessage
    if err := json.Unmarshal(e.RawData, &msg); err != nil {
        return false, err
    }

    // Get all users in this room
    roomData, _ := s.daprClient.GetState(ctx, "statestore", "room:"+msg.RoomID+":members", nil)
    var memberIDs []string
    json.Unmarshal(roomData.Value, &memberIDs)

    // Deliver to locally connected users
    msgJSON, _ := json.Marshal(msg)
    for _, userID := range memberIDs {
        if conn, ok := s.connections.Load(userID); ok {
            conn.(*websocket.Conn).WriteMessage(websocket.TextMessage, msgJSON)
        }
    }
    return false, nil
}
```

## Message History with Dapr State

```go
func (s *ChatServer) saveMessage(msg ChatMessage) {
    ctx := context.Background()

    // Get current message list
    histKey := fmt.Sprintf("room:%s:history", msg.RoomID)
    histItem, _ := s.daprClient.GetState(ctx, "statestore", histKey, nil)

    var history []ChatMessage
    if histItem.Value != nil {
        json.Unmarshal(histItem.Value, &history)
    }

    // Keep last 100 messages
    history = append(history, msg)
    if len(history) > 100 {
        history = history[len(history)-100:]
    }

    data, _ := json.Marshal(history)
    s.daprClient.SaveState(ctx, "statestore", histKey, data, nil)
}

func (s *ChatServer) getHistory(roomID string, limit int) []ChatMessage {
    histKey := fmt.Sprintf("room:%s:history", roomID)
    item, _ := s.daprClient.GetState(context.Background(), "statestore", histKey, nil)

    var history []ChatMessage
    json.Unmarshal(item.Value, &history)

    if len(history) > limit {
        return history[len(history)-limit:]
    }
    return history
}
```

## Presence Tracking

```go
func (s *ChatServer) setPresence(userID, roomID string, online bool) {
    presence := UserPresence{
        UserID:   userID,
        RoomID:   roomID,
        Online:   online,
        LastSeen: time.Now().Unix(),
    }
    data, _ := json.Marshal(presence)
    s.daprClient.SaveState(
        context.Background(),
        "statestore",
        "presence:"+userID,
        data,
        nil,
    )

    // Publish presence change
    s.daprClient.PublishEvent(
        context.Background(),
        "pubsub",
        "presence-updates",
        presence,
    )
}
```

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: chat-server
spec:
  replicas: 3  # Multiple instances, pub/sub routes messages
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "chat-server"
        dapr.io/app-port: "8080"
```

## Summary

Dapr pub/sub solves the core challenge of real-time chat across multiple server instances: messages published to room topics are delivered to all subscribers regardless of which instance the sending client is connected to. Dapr state provides persistent message history and presence tracking. This architecture scales horizontally without requiring sticky sessions or a separate message broker client library.
