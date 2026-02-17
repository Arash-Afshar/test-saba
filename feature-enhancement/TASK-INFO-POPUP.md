# Task: Improve Indoor Info Popup Content

### Background
In Indoor Navigation, the info button (top-right) opens a popup that currently only shows the latest floor plan update date. This is insufficient for users to understand their environment or make decisions.

### Objective
Design a more useful Info popup by proposing content that helps users navigate, understand indoor data quality, and take action. There are no content limitations.

### Prerequisite
Install and try the Pedesting app. Use Indoor Navigation and open the Info popup.

### Steps to reach the feature (from default screen)
1. Open the app.
2. Enter Indoor Navigation (select a building and start indoor navigation).
3. Tap the info icon at the top-right.
4. Observe the current popup content.

### Task description
Propose what the Info popup should show instead of only a floor plan update date. The goal is to make the popup useful and actionable for indoor navigation users.

## Candidate deliverable (fill in the sections below)

### Description
_Write a concise description of the enhancement._

- Info Popup icon appears only when user selects start/destination and path is suggested. It shows updated map date. Path details can be added to the Info Popup.These details are:
    - Travel time(minute) 
    - Access (number of stairs/elevators on the path).
Access details show the number of facilities on the path to help user be more cautious about the path and be informed

### Example content
_Provide example text/structure you would show in the popup._

The proposed Info Popup file is saved as "Popup proposal.png"

### Design suggestion
_Provide a simple layout suggestion or hierarchy (title/sections/actions)._

The proposed Info Popup file is saved as "Popup proposal.png"

### Acceptance criteria
_List measurable criteria for success._

- Popup icon click rate. (#Icon click/#Route sessions)
    This will show how many times a user clicks on the this icon during a route or it is not clicked
    at all.

- Average time spent on the Popup.
    Longer time spent watching time shows that information is useful for the user.

- Number of cancelled navigation.
    After seeing this information, less number of cancelation of navigation route shows the user satisfaction of access.

### Optional
_If helpful, include risks/assumptions._

- Without crowd, construction, and obstacle information it is not a real-time experience for the user.
