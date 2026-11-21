#include "drain_futures.h"
#include <cassert>
#include <future>
#include <stdexcept>
struct Result { bool success; bool IsSuccess() const { return success; } };
struct Future {
    std::future<Result> value;
    Result GetValueSync() { return value.get(); }
};
int main() {
    for (int scenario : {0, 1, 2}) {
        int completed = 0;
        // Deferred tasks make the test deterministic: each runs when drained.
        std::vector<Future> pending;
        for (int i = 0; i < 2; ++i) {
            pending.push_back({std::async(std::launch::deferred, [&, i] {
                ++completed;
                if (scenario == 2 && i == 0) throw std::runtime_error("first failed");
                return Result{!(scenario == 1 && i == 0)};
            })});
        }
        try {
            bool ok = DrainAll(pending);
            assert(scenario != 2 && ok == (scenario == 0));
        } catch (const std::runtime_error&) { assert(scenario == 2); }
        assert(completed == 2);
    }
}
