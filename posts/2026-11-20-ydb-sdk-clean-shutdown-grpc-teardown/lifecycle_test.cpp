#include "with_stopped_driver.h"
#include <cassert>
#include <stdexcept>
#include <string>
#include <vector>

struct FakeDriver {
    std::vector<std::string>& events;
    void Stop(bool wait) {
        assert(wait);
        events.push_back("driver stopped");
    }
};
struct ScopedClient {
    std::vector<std::string>& events;
    ~ScopedClient() { events.push_back("client destroyed"); }
};
int main() {
    for (bool fail : {false, true}) {
        std::vector<std::string> events;
        FakeDriver driver{events};
        try {
            int code = WithStoppedDriver(driver, [&] {
                ScopedClient client{events};
                events.push_back("work finished");
                if (fail) throw std::runtime_error("work failed");
                return 7;
            });
            assert(!fail && code == 7);
        } catch (const std::runtime_error& e) {
            assert(fail && std::string(e.what()) == "work failed");
        }
        assert((events == std::vector<std::string>{
            "work finished", "client destroyed", "driver stopped"}));
    }
}
