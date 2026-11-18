#include <iostream>
#include <map>
#include <string>

class Idle;

class State {
protected:
    Idle *statemachine;

public:
    virtual ~State() {}

    void set_context(Idle *statemachine) {
        this->statemachine = statemachine;
    }

    virtual std::string get_name() {
        return "Unknown";
    }
};


class Idle {
private:
    State* state = nullptr;

public:
    Idle(State* initial_state) {
        initial_state->set_context(this);
        state = initial_state;
        std::cout << "[" << state->get_name() << "]" << std::endl;
    }

    ~Idle() {
        if (state != nullptr) {
            delete state;
        }
    }

    void transition_to(State *new_state) {
        std::cout << state->get_name() << " ===> " << new_state->get_name() << std::endl;
        if (state != nullptr) {
            delete state;
        }
        new_state->set_context(this);
        state = new_state;
    }
};


class Sleeping : public State {
public:
    std::string get_name() override { return "Sleeping"; }
};

// Sleeping

typedef void (Idle::*Event)();

int main() {
    Idle *statemachine = new Idle(new Sleeping);

    static std::map<std::string, Event> event_by_name;

    for (std::string input; std::getline(std::cin, input);) {
        std::map<std::string, Event>::const_iterator event_by_name_it = event_by_name.find(input);
        if (event_by_name_it == event_by_name.end()) {
            std::cout << "There is no event <" << input << "> in the Idle statemachine." << std::endl;
            continue;
        }
        Event event_invoker = event_by_name_it->second;
        (statemachine->*event_invoker)();
    }

    delete statemachine;
    return 0;
}
