package main
import (
    "fmt"
    "os"
    "runtime"
    "runtime/debug"
    "runtime/metrics"
    "runtime/pprof"
)
var held []byte
func report(label string) {
    names:=[]string{"/memory/classes/heap/objects:bytes","/memory/classes/heap/free:bytes","/memory/classes/heap/released:bytes","/memory/classes/heap/stacks:bytes","/memory/classes/total:bytes"}
    samples:=make([]metrics.Sample,len(names));for i,n:=range names { samples[i].Name=n };metrics.Read(samples)
    fmt.Println(label);for _,s:=range samples { fmt.Printf("%s=%d\n",s.Name,s.Value.Uint64()) }
}
func main() {
    held=make([]byte,128<<20)
    for i:=0;i<len(held);i+=4096 { held[i]=1 }
    report("allocated")
    held=nil
    runtime.GC()
    report("after GC")
    f,err:=os.Create("heap.pprof");if err!=nil { panic(err) }
    if err=pprof.WriteHeapProfile(f);err!=nil { panic(err) };if err=f.Close();err!=nil { panic(err) }
    debug.FreeOSMemory()
    report("after FreeOSMemory")
}
