import React, { Component } from "react";
import axios from "axios";

import classnames from "classnames";
import Loading from "./Loading";
import Panel from "./Panel";

import {
  getTotalInterviews,
  getLeastPopularTimeSlot,
  getMostPopularDay,
  getInterviewsPerDay
 } from "helpers/selectors";
 import { setInterview } from "helpers/reducers";

 const data = [
  {
    id: 1,
    label: "Total Interviews",
    getValue: getTotalInterviews
  },
  {
    id: 2,
    label: "Least Popular Time Slot",
    getValue: getLeastPopularTimeSlot
  },
  {
    id: 3,
    label: "Most Popular Day",
    getValue: getMostPopularDay
  },
  {
    id: 4,
    label: "Interviews Per Day",
    getValue: getInterviewsPerDay
  }
];

class Dashboard extends Component {
  state = {
    loading: true,
    focused: null,
    days: [],
    appointments: {},
    interviewers: {}
   };

  selectPanel(id) {
    this.setState(previousState => ({
      focused: previousState.focused !== null ? null : id
    }));
  }

  componentDidMount() {
    const focused = JSON.parse(localStorage.getItem("focused"));

    if (focused) {
      this.setState({ focused });
    }
    Promise.all([
      axios.get("/api/days"),
      axios.get("/api/appointments"),
      axios.get("/api/interviewers")
    ]).then(([days, appointments, interviewers]) => {
      this.setState({
        loading: false,
        days: days.data,
        appointments: appointments.data,
        interviewers: interviewers.data
      });
    });
    
    this.socket = new WebSocket(process.env.REACT_APP_WEBSOCKET_URL);
    
    // To listen for messages on the socket connection and use them to update the state when we book or cancel an interview
    // Converts the string data to JavaScript data types
    // If the data is an object with the correct type, then we update the state
    // We use a setInterview helper function to convert the state using the id and interview values
    this.socket.onmessage = event => {
      const data = JSON.parse(event.data);
    
      if (typeof data === "object" && data.type === "SET_INTERVIEW") {
        this.setState(previousState =>
          setInterview(previousState, data.id, data.interview)
        );
      }
    };
  }

  // JSON.stringify to convert our values before writing them to the localStorage
  componentDidUpdate(previousProps, previousState) {
    if (previousState.focused !== this.state.focused) {
      localStorage.setItem("focused", JSON.stringify(this.state.focused));
    }
  }

  // Close the socket using the instance variable that holds the reference to the connection
  componentWillUnmount() {
    this.socket.close();
  }

  render() {
    const dashboardClasses = classnames("dashboard", {
      "dashboard--focused": this.state.focused
    });

    if (this.state.loading) {
      return <Loading />;
    }

    const panels = data
      // To filter panel data before converting it to components
      // If this.state.focused is null then return true for every panel
      // If this.state.focused is equal to the Panel, then let it through the filter
      .filter(
        panel => this.state.focused === null || this.state.focused === panel.id)

      // Map over the data array and create a new Panel for each of the four data objects
      // Render the panels array as children of the main element
      .map(panel => (
        <Panel
          key={panel.id}
          label={panel.label}
          value={panel.getValue(this.state)}
          onSelect={event => this.selectPanel(panel.id)}
        />
      ));

    return <main className={dashboardClasses}>{panels}</main>;
  }
}

export default Dashboard;
