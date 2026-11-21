// Standard C++ ownership model, not a YDB session implementation.
#include <cassert>
#include <functional>
#include <memory>
#include <optional>
#include <vector>

struct Lease {
    int& active;
    explicit Lease(int& count) : active(count) { ++active; }
    ~Lease() { --active; }
};
using Handle = std::shared_ptr<Lease>;
struct AcquisitionResult {
    Handle session;
    Handle GetSession() const { return session; }
};

int main() {
    int active = 0;
    {
        AcquisitionResult result{std::make_shared<Lease>(active)};
        std::optional<Handle> local = result.GetSession();
        local.reset();
        assert(active == 1); // The acquisition result still owns the lease.
    }
    assert(active == 0);
    std::vector<std::function<void()>> callbacks;
    {
        AcquisitionResult result{std::make_shared<Lease>(active)};
        auto session = result.GetSession();
        callbacks.emplace_back([session] {});
    }
    assert(active == 1);
    callbacks.front()();
    assert(active == 1); // Invoking a stored callback does not destroy it.
    callbacks.clear();
    assert(active == 0);
}
