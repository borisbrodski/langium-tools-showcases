package com.example;

import java.util.function.Consumer;

public enum TrafficLightEvents {
    switchCapacity,
    next;

    public void dispatch(Consumer<TrafficLightEvents> listener) {
        listener.accept(this);
    }
}
