package main
import (
    "fmt"
    "context"
    "os"
    "runtime/trace"
    "runtime/metrics"
    "time"
)
var retained [][]byte
func sample() {
    names := []string{"/gc/gomemlimit:bytes", "/gc/heap/live:bytes", "/gc/heap/goal:bytes", "/gc/cycles/total:gc-cycles", "/gc/limiter/last-enabled:gc-cycle", "/cpu/classes/gc/mark/assist:cpu-seconds", "/cpu/classes/gc/total:cpu-seconds", "/memory/classes/total:bytes", "/memory/classes/heap/released:bytes"}
    samples := make([]metrics.Sample,len(names))
    for i,n := range names { samples[i].Name=n }
    metrics.Read(samples)
    for _,s := range samples {
        if s.Value.Kind()==metrics.KindUint64 { fmt.Printf("%s=%d\n",s.Name,s.Value.Uint64()) } else { fmt.Printf("%s=%.6f\n",s.Name,s.Value.Float64()) }
    }
}
func main() {
    f,err:=os.Create("trace.out");if err!=nil { panic(err) };defer f.Close()
    if err=trace.Start(f);err!=nil { panic(err) };defer trace.Stop()
    ctx,task:=trace.NewTask(context.Background(),"allocation-batch");defer task.End()
    retained=make([][]byte,48)
    for i:=range retained { retained[i]=make([]byte,1<<20);retained[i][0]=1 }
    ring:=make([][]byte,4)
    end:=time.Now().Add(200*time.Millisecond)
    work:=0
    trace.WithRegion(ctx,"allocate",func() {
        for time.Now().Before(end) { ring[work%len(ring)]=make([]byte,64<<10);work++ }
    })
    fmt.Printf("completed allocations=%d\n",work)
    sample()
}
