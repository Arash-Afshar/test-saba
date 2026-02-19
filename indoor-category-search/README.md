# Indoor Route Preview Exercise

## Goal
Build a usable indoor start/destination experience, including filtering and a route preview panel.

## Setup
1. Open `index.html` in a browser.
2. Select a start point and destination.
3. Click “Preview route” to see the route summary.

## Requirements
- Implement category filtering for the start and destination inputs, plus any 1–2 additional filters you deem useful.
- Design the filtering UX in the way you consider best (UI/UX is part of the task).
- Implement the route preview details and the visual design for that panel.
- Distance could be calculated from `location` data.
- The design must be responsive and optimized for iPhone-sized devices in both portrait and landscape.
- Avoid page reloads and keep interactions smooth.

## Deliverables
- Updated HTML/CSS/JS files.
- A short note (bullet points) explaining your approach.

## Notes
- Data is located in `data.json`.
- You should not introduce external libraries, but you may briefly describe which libraries you would use and why if they were allowed.

# Explanation of the Deliverable

## Methodology
I have implemented the requirements and updated existing files. To make the code more readable, I extracted some of the logic into the route preview files.
To implement it, I used Cursor IDE and its AI features, but it is not vibe-coded. Rather, it is planned and iteratively built to improve the functionality, and maintain code readability.


## Supported Devices
As instructed in the requirements section, I only focused on iPhone-sized devices (both portrait and landscape). As a result, when you run it on your machine and go to the URL, you may notice that since the screen is large, it shows the landscape mode. However, once you switch to mobile view (right-click, then inspect), you will see portrait mode.

## Assumptions
The data.json file appeared to have missing information. For example, an elevator was on one floor but not on other floors, or a connector was in one building but not in other buildings. Therefore, I updated the data and fixed some of these cases for testing purposes. I added data to connect some floors, like the A-Block Elevator on floor 1 and floor 2 in building 101. There was a skywalk connector in building 102 on floor 2. I added the same data to building 103, floor 2, to create an available route between buildings 101-103.
Furthermore, there was no floor plan for the building, so when creating a route, I simply drew a straight line.


## Features
In all the following features, I have used ARIA Accessibility labels to provide an accessible solution. I tested it with the Lighthouse Accessibility Checker tool and got 100 on both accessibility and best practices.

After the user selects the source or destination, a modal opens that lets the user choose the location using various filters. The primary way of searching is by typing in the search box. Currently, it performs a simple substring match, but given more time, it can be improved to use fuzzy matching. Furthermore, a quick access panel is provided to filter for popular POIs. By expanding the filter menu, the user can also filter the results based on the building number, floor, POI category, and POI type. To make the result list informative, it includes each POI's name, category, building number, and floor. Also, each POI's information, like open/closed status and rating value, is shown to the user. At the moment, all matching results are shown instead of showing only the top 10. Given more time, this can be changed to a pagination style of output. The user can swap the order of the source and destination by clicking on the swap button.


Once the user has chosen the start and destination locations and clicks on the preview route button, the route information is shown. Since this is an indoor routing application, I chose to show the route in segments, and the user clicks to see the next or previous segment. There is one segment per floor and one segment per connector type (elevator, stairs, building connector, etc.). Furthermore, when there is an option to take the stairs or the elevator, I prioritized the elevator (of course, this can be changed if, instead of accessibility, the priority is environmental). Moreover, when users click on the POIs on the map, a popup box appears and shows the POI's image, website, working days/hours, opening status, and rating, if they exist.



## Route Finding Details
The calculateDistance function estimates the distance between two latitude/longitude points by converting degree differences into meters and applying the Euclidean distance formula, which is accurate enough for small indoor areas. The normalizeCoordinates function converts real-world geographic coordinates of POIs into scaled SVG screen coordinates, ensuring they fit properly within a defined map boundary while maintaining their relative spatial positions.

We assume that between two buildings, there is at most one connector. In the code, indoor routing uses two graphs:
  - A building graph
  - A floor graph

The building graph has one node per building and connects buildings that share a connector POI with the same name. BFS on this graph gives the sequence of buildings and connectors for cross-building routes. The floor graph handles movement within a building. Nodes are floor IDs, and floors are connected if they share a vertical link. A weighted shortest-path search prefers elevators over stairs, generating steps like taking an elevator/stairs to the next floor.



## Future improvements

- Using building blueprints and a more detailed building map, the routing can be enhanced to take the plan into account instead of showing a straight line.
- At the moment the user cannot interact with the map to choose start and destination. This can be added in future versions.
- In the requirements, it was mentioned that it should be responsive for iPhone-sized devices. In the future, we can extend it to support the web as well.
- In the future, we will be able to add crowd data, show crowded areas on the route, and suggest a less crowded route.

## If Libraries Were Allowed

- React - Frontend Framework:
    If external libraries were allowed, I would consider using React to improve component modularity and state management. As applications grow in complexity, managing UI updates manually through DOM manipulation becomes harder to maintain. React’s component-based architecture and virtual DOM would simplify rendering logic, improve performance, and enhance code reusability.

- Bootstrap - CSS Framework:
    To improve development speed and maintain design consistency, I would consider Bootstrap. This framework provides predefined utility classes and responsive design systems, which reduce repetitive CSS and improve maintainability.

- Enhanced Maps
    I would use the map library that you have shown in `feature-enhancement/image.png` instead of the white screen with dots that I currently have.