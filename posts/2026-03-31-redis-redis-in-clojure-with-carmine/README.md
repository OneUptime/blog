# How to Use Redis in Clojure with Carmine

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Clojure, Carmine, Functional Programming, JVM

Description: Learn how to use Redis in Clojure with the Carmine library, covering connection pools, commands, pipelines, Pub/Sub, and message queues.

---

Carmine is the most feature-complete Redis client for Clojure. It uses a connection pool under the hood and provides a macro-based DSL that maps directly to Redis commands.

## Setup

```clojure
;; project.clj or deps.edn
[com.taoensso/carmine "3.5.0"]
```

## Connection Spec

Define a server spec and a connection macro:

```clojure
(ns myapp.redis
  (:require [taoensso.carmine :as car :refer [wcar]]))

(def server-conn
  {:pool {} ;; use default connection pool
   :spec {:host "127.0.0.1"
          :port 6379
          :password nil
          :db 0
          :timeout-ms 3000}})

(defmacro wcar* [& body]
  `(car/wcar server-conn ~@body))
```

## Basic Operations

```clojure
;; SET and GET
(wcar* (car/set "user:1:name" "Alice"))
(println (wcar* (car/get "user:1:name")))  ;; "Alice"

;; Increment
(wcar* (car/set "visits" 0))
(println (wcar* (car/incr "visits")))  ;; 1

;; Key expiry
(wcar* (car/setex "session:abc" 3600 "user:1"))

;; Hash
(wcar* (car/hmset "profile:1" "city" "Berlin" "age" 32))
(println (wcar* (car/hget "profile:1" "city")))  ;; "Berlin"
```

## Pipelining

Multiple commands in one `wcar*` call are automatically pipelined:

```clojure
(let [[name score] (wcar*
                     (car/get "user:1:name")
                     (car/zscore "leaderboard" "user:1"))]
  (println name score))
```

## Storing Clojure Data Structures

Carmine serializes Clojure values automatically with Nippy:

```clojure
;; Store a map directly
(wcar* (car/set "config:app" {:max-connections 10 :timeout 5000 :debug? false}))

;; Retrieve as Clojure map
(let [config (wcar* (car/get "config:app"))]
  (println (:max-connections config)))  ;; 10
```

## Pub/Sub

```clojure
(defn message-handler [[msg-type channel message]]
  (println (str "Type: " msg-type
                " Channel: " channel
                " Message: " message)))

;; Start listener in a separate thread
(def my-listener
  (car/with-new-pubsub-listener
    (:spec server-conn)
    {"notifications" message-handler}
    (car/subscribe "notifications")))

;; Publish from another thread
(wcar* (car/publish "notifications" "Hello, Carmine!"))

;; Unsubscribe and close
(car/close-listener my-listener)
```

## Message Queue

Carmine includes a durable message queue built on Redis:

```clojure
(require '[taoensso.carmine.message-queue :as mq])

;; Enqueue a job
(wcar* (mq/enqueue "jobs" {:type "email" :to "alice@example.com"}))

;; Worker
(def worker
  (mq/worker server-conn "jobs"
    {:handler (fn [{:keys [message]}]
                (println "Processing:" message)
                {:status :success})}))

;; Stop worker
(mq/stop worker)
```

## Summary

Carmine's `wcar` macro makes Redis feel native in Clojure. Multiple calls in one `wcar` block are automatically pipelined, and Clojure data structures are serialized transparently via Nippy. Use Carmine's built-in message queue for durable job processing and `with-new-pubsub-listener` for real-time messaging.
