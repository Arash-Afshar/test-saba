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


## Explanations
- This experience is a responsive and optimized for iPhone-sized devices (iPhone X and upper versions) in both portrait and landscape. In previous versions it works in portrait mode well, but for landscape I need more time to improve it.

- User in the search panel can select the start and destination point. When user selects the start/destination input boxes, a picker sheet opens and user can both search for the POI's name and, selects from all available POI's list. A quick access panel is provided for popular POIs. A filter panel is implemented. User can filter the results base on the building number, Floor, POI's category and type. The results list includes each POIs' name, category, building number, and floor. Also, each POIs information data like close/open and rating value is shown that user be more informative about the area. 

- In search panel switch button is provided to change the start/ destination easily.

- To see the route between start/destination. user clicks the View route button and to reset the start/destination clicks the clear button. Start POI turns to green, and destination POI turns to red.

- When user click on the POIs on the map, a popup box appears and shows the POIs' image, website, working days/hours, opening status, rating if they exist. 

- When start/destination are selected and route found, the distance of whole path appears. 

- Route information box shows the steps to take from start-destination with a short sentence with path length to the next step. To see the next step, user clicks the next button, and it will show the next information sentence. There is also a previous button to see the previous step. When a route has multiple stapes, a green circle is drawn around the current POI to provide an easier view of the current state. When user arrives to the destination a popup box appears and show the success travel done. If there is no route found, a popup box appears around no route found to inform the user.

- Euclidean distance is used for distance calculation.

- The calculateDistance function estimates the distance between two latitude/longitude points by converting degree differences into meters and applying the Euclidean distance formula, which is accurate enough for small indoor areas. The normalizeCoordinates function converts real-world geographic coordinates of POIs into scaled SVG screen coordinates, ensuring they fit properly within a defined map boundary while maintaining their relative spatial positions.

In the code, it uses two graphs for indoor routing:
    - A building graph
    - A floor graph
    The building graph has one node per building and connects buildings that share a connector POI with the same name. BFS on this graph gives the sequence of buildings and connectors for cross-building routes. 
    The floor graph handles movement within a building. Nodes are floor IDs, and floors are connected if they share a vertical link. A weighted shortest-path search prefers elevators over stairs, generating steps like take elevator/stairs to next floor.

In some parts, I used Cursor (AI-powered code editor) to implement some parts easier and improve code quality.

## Limitations

- According to the limitation in data regarding the building map, I could not draw the map building. As no other data is provided about the building corridors, the path is a straight line between POIs.

- There was limited data for access points between building floors and access to other buildings. (An access point must be common and exist for other floors to be connected). For testing the process, I added some data to connect some floors like A-Block Elevator in floo1 and floor 2 in building 101. There was a skywalk connector in building 102 on floor 2. I added the same data to building 103 floor 2 to create an available route between building 101-103.


## Future improvements

- We can add tap option on the POIs. In this case user can selects the start/destination POIs without only typing.

- In the requirement it was mentioned to be responsive for iPhone devices. In the future and having more time, we can make it responsive to more devices and webs.

- Using building blueprints more detailed building map and route will be implemented.

- In the future, we will be able to add crowd data and show the crowded areas on the route and suggest less crowded route.

## If Libraries Were Allowed

- React - Frontend Framework:
    If external libraries were allowed, I would consider using React to improve component modularity and state management. As applications grow in complexity, managing UI updates manually through DOM manipulation becomes harder to maintain. React’s component-based architecture and virtual DOM would simplify rendering logic, improve performance, and enhance code reusability.

- Bootstrap - CSS Framework:
    To improve development speed and maintain design consistency, I would consider Bootstrap. This framework provides predefined utility classes and responsive design systems, which reduce repetitive CSS and improve maintainability.

- React Router - Routing Library:
    Routing Library: For navigation management in a single-page application, I would use a routing library such as React Router to enable structured, declarative routing instead of manually showing and hiding views.

