package main

import (
    "fmt"
    "runtime"
    "runtime/metrics"
)

var retained [][]byte
func main() {
    retained = make([][]byte, 32)
    for i := range retained { retained[i] = make([]byte, 1<<20) }
    ring := make([][]byte, 8)
    for i := 0; i < 400; i++ { ring[i%len(ring)] = make([]byte, 1<<20) }
    runtime.KeepAlive(ring)
    samples := []metrics.Sample{
        {Name: "/gc/gogc:percent"},
        {Name: "/gc/gomemlimit:bytes"},
        {Name: "/gc/heap/live:bytes"},
        {Name: "/gc/heap/goal:bytes"},
        {Name: "/memory/classes/total:bytes"},
        {Name: "/memory/classes/heap/released:bytes"},
        {Name: "/gc/cycles/total:gc-cycles"},
    }
    metrics.Read(samples)
    for _, s := range samples { fmt.Printf("%s=%d\n", s.Name, s.Value.Uint64()) }
}
