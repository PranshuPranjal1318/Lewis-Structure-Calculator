// Create a map to store periodic table data where the key is the atom symbol
const PERIODIC_TABLE_MAP = {};

// Populate the map with data from the global periodic_table object

for (let atom of window.periodic_table) {
  PERIODIC_TABLE_MAP[atom.symbol] = atom;
}

// Get all atom symbols as an array
const ATOM_SYMBOLS = Object.keys(PERIODIC_TABLE_MAP);

// Sort atom symbols by length in descending order
ATOM_SYMBOLS.sort((a, b) => b.length - a.length);

// Get the canvas element from the DOM
const canvas = document.getElementById("canvas");

// Get the 2D drawing context for the canvas
const ctx = canvas.getContext("2d");

// This ctx will be used to draw atoms bonds and other graphics on the
// canvas

// Get the charge selector element from the DOM
const chargeSelector = document.getElementById("charge-selection");

// Get the molecule data element from the DOM
const moleculeData = document.getElementById("molecule-stats");

// Get the errors element from the DOM
const errors = document.getElementById("errors");

// Create a resize observer to adjust the canvas size dynamically
const resizeObserver = new ResizeObserver(() => {
  // Set the canvas width to its client width
  canvas.width = Math.round(canvas.clientWidth);

  // Set the canvas height to its client height
  canvas.height = Math.round(canvas.clientHeight);
});

// Observe the canvas for resizing
resizeObserver.observe(canvas);

// Define a class to represent an atom drawn on the canvas
class DrawnAtom {
  constructor(x, y, type, id) {
    // The x-coordinate of the atom on the canvas
    this.x = x;

    // The y-coordinate of the atom on the canvas
    this.y = y;

    // The type (symbol) of the atom
    this.type = type;

    // A unique identifier for the atom
    this.id = id;

    // The charge of the atom (default is 0)
    this.charge = 0;

    // A set to store connections (bonds) to other atoms
    this.connectTo = new Set();
  }
}

// Define a global object to store the state of the molecule graph
window.graphState = {
  idToAtomMap: {}, // Maps atom IDs to atom objects
  idToElectrons: {}, // Maps atom IDs to the number of valence electrons assigned to them
  totalValence: 0, // Total number of valence electrons in the molecule
  moleculeCharge: 0, // Charge of the entire molecule
  bonds: [], // Array to store bonds as pairs of atom IDs [id1, id2]
  bondStrengthMap: {}, // Maps bond pairs "id1,id2" to bond strength (single, double, triple)
  bondIdMap: {}, // Maps atom IDs to the IDs of atoms they are bonded to
};

// Function to update the state of the molecule graph
window.updateGraphState = () => {
  // Reset the bonds array
  window.graphState.bonds = [];
  // Reset the bond strength map
  window.graphState.bondStrengthMap = {};
  // Reset the bond ID map
  window.graphState.bondIdMap = {};
  // Reset the atom ID to atom object map
  window.graphState.idToAtomMap = {};
  // Reset the atom ID to electrons map
  window.graphState.idToElectrons = {};
  // Initialize the total valence electrons with the negative of the molecule charge
  window.graphState.totalValence = -graphState.moleculeCharge;

  let atomValence = {}; // Object to store the valence electron count for each atom type

  // Function to set the bond strength between two atoms
  function setBondStrength(atom, connection, strength) {
    // Set the bond strength from atom to connection
    graphState.bondStrengthMap[`${atom.id},${connection.id}`] = strength;
    // Set the bond strength from connection to atom (bidirectional)
    graphState.bondStrengthMap[`${connection.id},${atom.id}`] = strength;
  }

  // Function to get the maximum number of electrons an atom can have
  function getMaxElectronsForAtom(atom) {
    let maxElectronsForAtom = 8; // Default maximum electrons for most atoms is 8
    if (atom.type === "H") maxElectronsForAtom = 2; // Hydrogen (H) can only have 2 electrons
    if (PERIODIC_TABLE_MAP[atom.type].period >= 3) maxElectronsForAtom = 999; // Atoms in period 3 or higher can have more than 8 electrons
    return maxElectronsForAtom; // Return the calculated maximum electrons for the atom
  }

  let electronegativityMap = {}; // Object to store the electronegativity of each atom type

  // Loop through each atom in the drawing state
  for (let atom of window.drawingState.atoms) {
    const valenceElectronsForAtom = PERIODIC_TABLE_MAP[atom.type].shells.at(-1); // Get the number of valence electrons for the atom
    window.graphState.totalValence += valenceElectronsForAtom; // Add the valence electrons to the total valence count
    if (!atomValence[atom.type]) {
      // If the atom type is not already in the atomValence object
      atomValence[atom.type] = {
        // Create an entry for the atom type
        count: 0, // Initialize count to 0
        perAtom: valenceElectronsForAtom, // Store the valence electrons per atom
        name: atom.type, // Store the atom type name
      };
    }
    atomValence[atom.type].count++; // Increment the count of this atom type
    electronegativityMap[atom.type] =
      PERIODIC_TABLE_MAP[atom.type].electronegativity_pauling; // Store the electronegativity of the atom type

    window.graphState.idToAtomMap[atom.id] = atom; // Map the atom ID to the atom object
    for (let connection of atom.connectTo) {
      // Loop through each connection of the atom
      if (!graphState.bondIdMap[atom.id]) graphState.bondIdMap[atom.id] = []; // If no entry exists, create an array for the atom's bonds
      if (!graphState.bondIdMap[connection.id])
        graphState.bondIdMap[connection.id] = []; // If no entry exists, create an array for the connection's bonds

      graphState.bondIdMap[atom.id].push(connection.id); // Add the connection ID to the atom's bond array
      graphState.bondIdMap[connection.id].push(atom.id); // Add the atom ID to the connection's bond array
      graphState.bonds.push([atom.id, connection.id].sort()); // Add the bond to the list of bonds
      setBondStrength(atom, connection, 1); // Set the initial bond strength to 1
    }
  }

  // Set the text content of the element with id 'electronegativity' to the sorted electronegativity values
  document.getElementById("electronegativity").innerText =
    [...Object.keys(electronegativityMap)] // Get the atom types
      .sort((a, b) => electronegativityMap[a] - electronegativityMap[b]) // Sort the atom types by their electronegativity values
      .join(" → ") || // Join the sorted atom types with ' → ' separator
    "N/A"; // If no atom types, set the text to 'N/A'

  // Set the text content of the element with id 'period3' to the atom types from period 3 and above
  document.getElementById("period3").innerText =
    [...Object.keys(electronegativityMap)] // Get the atom types
      .filter((x) => PERIODIC_TABLE_MAP[x].period >= 3) // Filter the atom types to include only those from period 3 and above
      .join(" → ") || // Join the filtered atom types with ' → ' separator
    "None"; // If no atom types from period 3 and above, set the text to 'None'

  // Calculate the total number of electrons used in bonds
  const bond_electrons_used = 2 * window.graphState.bonds.length;
  // Calculate the remaining budget of valence electrons
  let budget = graphState.totalValence - bond_electrons_used;
  // Initialize an array to hold central atoms
  let centralAtoms = [];

  // Loop through each atom in the drawing state
  for (let atom of window.drawingState.atoms) {
    if (budget === 0) break; // If budget is zero, break out of the loop
    if (graphState.bondIdMap[atom.id]?.length !== 1) {
      // If the atom has more than one bond
      centralAtoms.push(atom); // Add the atom to the central atoms array
      continue; // Continue to the next atom
    }
    if (atom.type === "H") continue; // Skip Hydrogen atoms as they can only have 2 electrons

    const cut = Math.min(budget, 6); // Calculate the number of electrons to add, ensuring not to exceed the budget or complete the octet
    graphState.idToElectrons[atom.id] = cut; // Assign the electrons to the atom
    budget -= cut; // Subtract the assigned electrons from the budget
  }

  // Add electrons to central atoms, sorted by electronegativity
  // Sort central atoms by their electronegativity in descending order
  centralAtoms.sort(
    (b, a) =>
      PERIODIC_TABLE_MAP[a.type].electronegativity_pauling -
      PERIODIC_TABLE_MAP[b.type].electronegativity_pauling
  );

  // Calculate the fair share of remaining electrons for each central atom
  let fairSplitAmt = Math.floor(budget / centralAtoms.length);

  // Round the fair share amount to the nearest multiple of 2
  if (fairSplitAmt % 2 == 1) fairSplitAmt++;

  // Loop through each central atom and assign electrons
  for (let atom of centralAtoms) {
    if (budget === 0) break; // If budget is zero, break out of the loop
    if (atom.type === "H") continue; // Skip Hydrogen atoms as they can only have 2 electrons

    // Calculate the number of electrons to add, ensuring not to exceed the budget,
    // the fair share amount, or the octet rule for atoms with multiple bonds
    const cut = Math.min(
      budget, // Ensure not to exceed the budget
      fairSplitAmt, // Ensure not to exceed the fair share amount
      8 - (graphState.bondIdMap[atom.id]?.length || 0) * 2 // Ensure not to exceed the octet rule
    );

    graphState.idToElectrons[atom.id] = cut; // Assign the electrons to the atom
    budget -= cut; // Subtract the assigned electrons from the budget
  }

  // Round robin remaining electrons
  // This loop distributes any remaining electrons among the central atoms
  // in a round-robin fashion until all the budget is exhausted or a maximum
  // number of iterations is reached.

  let max = 0; // Initialize a counter to keep track of the number of iterations

  // While there are still electrons left in the budget
  while (budget > 0) {
    // Iterate over each central atom
    for (let atom of centralAtoms) {
      if (budget === 0) break; // If budget is exhausted, break out of the loop
      if (atom.type === "H") continue; // Skip Hydrogen atoms

      // Calculate the number of electrons to add to the atom (maximum of 2 or remaining budget)
      const cut = Math.min(2, budget);

      // Check if adding the electrons would exceed the maximum allowed for the atom
      if (
        (graphState.bondIdMap[atom.id]?.length || 0) * 2 + // Current electrons in bonds
          (graphState.idToElectrons[atom.id] || 0) + // Current non-bonded electrons
          cut > // Electrons to be added
        getMaxElectronsForAtom(atom) // Maximum allowed electrons for the atom
      )
        continue; // Skip to the next atom if the maximum would be exceeded

      // Add the calculated number of electrons to the atom
      graphState.idToElectrons[atom.id] += cut;
      // Subtract the added electrons from the budget
      budget -= cut;
    }

    max++; // Increment the iteration counter

    // Break the loop if it has been executed more than 8 times
    // This prevents infinite loops and excessive iterations
    if (max > 8) break;
  }

  // Determine if there are excess electrons remaining in the budget
  let excessElectrons = budget > 0;

  // Compute formal charges for each atom
  function computeFormalCharges() {
    // Iterate over each atom in the drawing state
    for (let atom of window.drawingState.atoms) {
      let bondElectrons = 0;

      // Calculate the total number of electrons involved in bonds for the current atom
      for (let neighborId of graphState.bondIdMap[atom.id] || []) {
        bondElectrons += graphState.bondStrengthMap[`${atom.id},${neighborId}`];
      }

      // Calculate the formal charge for the atom
      // Formal charge = Valence electrons - Bonding electrons - Non-bonding electrons
      atom.charge =
        PERIODIC_TABLE_MAP[atom.type].shells.at(-1) - // Total valence electrons for the atom
        bondElectrons - // Total bonding electrons
        (graphState.idToElectrons[atom.id] || 0); // Non-bonding electrons
    }
  }

  // Call the function to compute formal charges
  computeFormalCharges();

  // Function to get the total number of electrons in bonds for a given atom
  function getElectronsInBonds(atom) {
    // Map each connected atom to its bond strength (number of electrons) and sum them up
    let arr = (graphState.bondIdMap[atom.id] || []).map(
      (a) => graphState.bondStrengthMap[`${atom.id},${a}`] * 2 // Multiply by 2 for each bond strength
    );

    // If there are no bonds, return 0
    if (!arr.length) return 0;

    // Sum up all the bonding electrons
    return arr.reduce((a, b) => a + b);
  }

  // Form double or triple bonds to resolve formal charge differences
  let recalcFormal = false; // Flag to determine if formal charges need to be recalculated

  // Iterate over each atom in the drawing state
  for (let atom of window.drawingState.atoms) {
    if (atom.type === "H") continue; // Skip Hydrogen atoms as they are not considered for multiple bonds

    let charge1sign = atom.charge < 0 ? 1 : -1; // Determine the sign of the atom's charge

    // Iterate over each connection of the current atom
    for (let neighbor of atom.connectTo) {
      if (neighbor.type === "H") continue; // Skip Hydrogen neighbors

      let charge2sign = neighbor.charge < 0 ? 1 : -1; // Determine the sign of the neighbor's charge

      // Resolve formal charge differences by forming additional bonds
      if (charge1sign !== charge2sign && atom.charge && neighbor.charge) {
        let bondStrength =
          graphState.bondStrengthMap[`${atom.id},${neighbor.id}`]; // Current bond strength between atom and neighbor

        let amt = Math.min(Math.abs(atom.charge), Math.abs(neighbor.charge)); // Maximum possible bond strength needed
        amt = Math.min(3 - bondStrength, amt); // Ensure the bond strength does not exceed a triple bond

        let electrons1 = getElectronsInBonds(atom); // Total number of bonding electrons in the atom
        let electrons2 = getElectronsInBonds(neighbor); // Total number of bonding electrons in the neighbor

        amt = Math.min(
          (getMaxElectronsForAtom(atom) - electrons1) / 2, // Maximum additional electrons atom can take
          (getMaxElectronsForAtom(neighbor) - electrons2) / 2, // Maximum additional electrons neighbor can take
          amt // The maximum amount of additional bonding electrons
        );

        if (amt > 0) {
          // Adjust the formal charges and bond strengths if there are electrons to add
          atom.charge += charge1sign * amt;
          neighbor.charge += charge2sign * amt;
          setBondStrength(atom, neighbor, bondStrength + amt); // Update bond strength

          // Function to calculate the free electrons needed to match the atom's charge
          function freeElectronsNeededToMatchCharge(atom, charge) {
            const valenceElectronsForAtom =
              PERIODIC_TABLE_MAP[atom.type].shells.at(-1); // Total valence electrons for the atom
            const bondCount = getElectronsInBonds(atom) / 2; // Number of bonds (each bond contributes 2 electrons)
            // Calculate the number of free electrons needed: X = valence - bonds - charge
            return valenceElectronsForAtom - bondCount - charge;
          }

          // Update the number of free electrons needed for both atom and neighbor
          graphState.idToElectrons[neighbor.id] =
            freeElectronsNeededToMatchCharge(neighbor, neighbor.charge);
          graphState.idToElectrons[atom.id] = freeElectronsNeededToMatchCharge(
            atom,
            atom.charge
          );

          recalcFormal = true; // Set flag to recalculate formal charges after adjusting bonds
        }
      }
    }
  }

  // Resolve incomplete octets by forming additional bonds if necessary
  const getElectronCount = (atom) =>
    getElectronsInBonds(atom) + (graphState.idToElectrons[atom.id] || 0); // Get the total number of electrons around an atom

  for (let atom of window.drawingState.atoms) {
    if (atom.type === "H") continue; // Skip Hydrogen atoms

    let electrons1 = getElectronCount(atom); // Total number of electrons around the current atom
    if (electrons1 < 8) {
      // Check if the atom has fewer than 8 electrons
      // Get neighbors of the current atom and sort them by electronegativity (high to low)
      let sortedNeighbors = graphState.bondIdMap[atom.id].map(
        (x) => graphState.idToAtomMap[x]
      );
      sortedNeighbors.sort(
        (b, a) =>
          PERIODIC_TABLE_MAP[a.type].electronegativity_pauling -
          PERIODIC_TABLE_MAP[b.type].electronegativity_pauling
      );

      // Try to form additional bonds with the sorted neighbors
      for (let neighbor of sortedNeighbors) {
        if (electrons1 >= 8) break; // Stop if the current atom has enough electrons
        if (neighbor.type === "H") continue; // Skip Hydrogen neighbors
        let electrons2 = getElectronCount(neighbor); // Total number of electrons around the neighbor

        if (electrons2 < 8) {
          // Check if the neighbor has fewer than 8 electrons
          // Calculate the number of additional bonds needed to complete octets
          let amt = 8 - Math.min(electrons1, electrons2);
          let bondStrength =
            graphState.bondStrengthMap[`${atom.id},${neighbor.id}`]; // Current bond strength between the atom and neighbor
          amt = Math.min(amt, 3 - bondStrength); // Ensure bond strength does not exceed triple bond

          electrons1 = getElectronCount(atom); // Recalculate electron count for the atom
          setBondStrength(atom, neighbor, bondStrength + amt); // Update bond strength
          graphState.idToElectrons[neighbor.id] -= amt; // Decrease the number of free electrons for the neighbor
          graphState.idToElectrons[atom.id] -= amt; // Decrease the number of free electrons for the atom

          recalcFormal = true; // Flag to recalculate formal charges after adjusting bonds
        }
      }
    }
  }

  if (recalcFormal) computeFormalCharges(); // Recalculate formal charges if changes were made
  recalcFormal = false; // Reset the flag after recalculation

  // Try to resolve atoms with too many electrons
  for (let atom of window.drawingState.atoms) {
    let electrons =
      getElectronsInBonds(atom) + (graphState.idToElectrons[atom.id] || 0); // Total number of electrons around the atom
    let maxElectronsForAtom = getMaxElectronsForAtom(atom); // Maximum allowable electrons for this atom

    if (electrons > maxElectronsForAtom) {
      // Check if the atom has more electrons than allowed
      // Get neighbors of the atom and sort them by electronegativity (high to low)
      let sortedNeighbors = (graphState.bondIdMap[atom.id] || []).map(
        (x) => graphState.idToAtomMap[x]
      );
      sortedNeighbors.sort(
        (b, a) =>
          PERIODIC_TABLE_MAP[a.type].electronegativity_pauling -
          PERIODIC_TABLE_MAP[b.type].electronegativity_pauling
      );

      // Try to resolve excess electrons by adjusting bonds with neighbors
      for (let neighbor of sortedNeighbors) {
        if (electrons <= maxElectronsForAtom) break; // Stop if the atom's electron count is within the limit
        if (neighbor.type === "H") continue; // Skip Hydrogen neighbors

        let electrons2 = getElectronCount(neighbor); // Total number of electrons around the neighbor
        let bondStrength =
          graphState.bondStrengthMap[`${atom.id},${neighbor.id}`]; // Current bond strength between the atom and neighbor

        // Reduce bond strength if the neighbor has a complete octet and the bond strength is greater than 1
        if (electrons2 === 8 && bondStrength > 1) {
          setBondStrength(atom, neighbor, bondStrength - 1); // Decrease bond strength
          electrons -= 2; // Decrease the excess electrons count
          graphState.idToElectrons[neighbor.id] += 2; // Increase the number of free electrons for the neighbor
        }
      }
    }
  }

  // Sanity checks
  // ------------------
  let errorMsgs = []; // Initialize an array to collect error messages

  // Check if there are excess electrons that were not used
  if (excessElectrons) errorMsgs.push("There seem to be excess electrons");

  // Ensure that the total valence electrons minus the electrons used in bonds is non-negative
  if (graphState.totalValence - bond_electrons_used < 0)
    errorMsgs.push("Too many bonds, not enough electrons");

  // Verify each atom to ensure it does not have more electrons than allowed
  for (let atom of window.drawingState.atoms) {
    let electrons =
      getElectronsInBonds(atom) + (graphState.idToElectrons[atom.id] || 0); // Total number of electrons around the atom

    let maxElectronsForAtom = getMaxElectronsForAtom(atom); // Maximum allowable electrons for this atom

    if (electrons > maxElectronsForAtom)
      errorMsgs.push(
        `Atom ${atom.type}: has ${electrons} electrons (max ${maxElectronsForAtom})!` // Error message for excess electrons
      );
  }

  // Check if the graph is fully connected
  if (drawingState.atoms.length) {
    let visited = new Set(); // Set to keep track of visited atoms
    let toVisit = [window.drawingState.atoms[0].id]; // Start with the first atom

    // Perform BFS to visit all connected atoms
    while (toVisit.length) {
      let current = toVisit[0]; // Get the current atom to visit
      toVisit = toVisit.slice(1); // Remove the current atom from the list
      if (visited.has(current)) continue; // Skip if the atom has already been visited
      visited.add(current); // Mark the current atom as visited

      // Add unvisited neighbors to the list of atoms to visit
      for (let conn of [...(graphState.bondIdMap[current] || [])])
        if (!visited.has(conn)) toVisit.push(conn);
    }

    // Check if the number of visited atoms matches the total number of atoms
    if (visited.size !== drawingState.atoms.length)
      errorMsgs.push("Graph is not fully connected"); // Error message if the graph is not fully connected
  }

  // Display error messages
  // ---------------------
  errors.innerHTML = errorMsgs.map((x) => `<li>${x}</li>`).join("\n"); // Convert error messages to an HTML list and set the inner HTML of the 'errors' element

  // Display help
  // ---------------------
  moleculeData.innerHTML = `
  <table>
      <tr>
          <td>Molecule Charge</td>
          <td>${-graphState.moleculeCharge}</td> // Display the absolute value of the molecule charge
      </tr>
      ${Object.keys(atomValence)
        .map(
          (k) =>
            `<tr><td>${atomValence[k].perAtom} x ${atomValence[k].count} ${
              atomValence[k].name
            }</td><td>${
              atomValence[k].count * atomValence[k].perAtom
            }</td></tr>` // Display each atom type, its per-atom valence, count, and total valence
        )
        .join("\n")}
      
      <tr>
          <td>Bonds</td>
          <td>${-bond_electrons_used}</td> // Display the number of electrons used in bonds
      </tr>
      <tr style="background-color: #dcdcdc">
          <td></td>
          <td>${
            graphState.totalValence - bond_electrons_used
          }</td> // Display the remaining valence electrons
      </tr>
  </table>`;
  drawCanvas(); // Call function to draw the canvas
};

// Initialize global state for drawing
window.drawingState = {}; // Current drawing state
window.drawingStateStack = []; // Stack to store previous drawing states for undo functionality
window.drawingStateStackIdx = 0; // Index to track the current position in the drawing state stack
window.uiState = {
  isMouseDown: false, // Flag to indicate if the mouse button is currently pressed
  mousePos: [0, 0], // Current mouse position
  isShiftDown: false, // Flag to indicate if the Shift key is pressed
};

// Function to reset the drawing state to its initial values
window.resetDrawingState = (update = true) => {
  window.drawingState = {
    atoms: [], // List of atoms in the drawing
    selectedAtom: null, // Currently selected atom
    startDragLoc: [0, 0], // Starting location of a drag operation
    idCounter: 0, // Counter for unique atom IDs
  };
  if (update) window.updateGraphState(); // Optionally update the graph state
};

// Reset the drawing state to its initial values
window.resetDrawingState();

// Function to push the current drawing state onto the stack
window.pushDrawingState = () => {
  window.drawingStateStackIdx++; // Move to the next index in the stack
  // Create a deep copy of the current drawing state to preserve its current state
  let copy = deepcopy({
    ...window.drawingState,
    atoms: window.drawingState.atoms.map((atom) => ({
      ...atom,
      connectTo: [...atom.connectTo], // Copy connections to prevent mutation
    })),
  });
  // Add the copy to the stack or replace the existing entry at the current index
  if (window.drawingStateStackIdx > window.drawingStateStack.length)
    window.drawingStateStack.push(copy);
  else window.drawingStateStack[window.drawingStateStackIdx - 1] = copy;
  // Trim the stack to the current index
  window.drawingStateStack = window.drawingStateStack.slice(
    0,
    window.drawingStateStackIdx
  );
  // Update the graph state
  window.updateGraphState();
};

// Function to switch to a previous state from the history stack
window.switchToHistoryState = () => {
  // Save the current drawing state to allow reverting back later
  let oldState = deepcopy(window.drawingState);

  // Load the previous state from the drawing state stack
  window.drawingState = deepcopy(
    window.drawingStateStack[window.drawingStateStackIdx - 1]
  );

  // Reinitialize atom objects with their previous state
  window.drawingState.atoms = window.drawingState.atoms.map((atom) => {
    let newSet = new Set(atom.connectTo); // Create a new Set for connections
    let ret = new DrawnAtom(atom.x, atom.y, atom.type, atom.id); // Create a new DrawnAtom instance
    ret.connectTo = newSet; // Restore connections
    ret.charge = atom.charge; // Restore charge
    return ret; // Return the new atom
  });

  // Fix references for atom connections
  let idMap = {}; // Map to associate atom IDs with atom objects
  for (let atom of drawingState.atoms) idMap[atom.id] = atom; // Populate the map with current atom objects

  // Update atom connections to use the new atom references
  for (let atom of drawingState.atoms) {
    let newSet = new Set(); // Create a new Set for updated connections
    for (let neighbor of atom.connectTo) newSet.add(idMap[neighbor.id]); // Add updated neighbor references
    atom.connectTo = newSet; // Assign the updated Set of connections
  }

  // Restore the starting drag location from the previous state
  window.drawingState.startDragLoc = oldState.startDragLoc;

  // Update the graph state to reflect the reverted drawing state
  window.updateGraphState();
};

// Function to pop the most recent drawing state from the stack
window.popDrawingState = () => {
  // Decrement the stack index to move to the previous state
  window.drawingStateStackIdx--;

  // Check if the stack index is out of bounds (below 1)
  if (window.drawingStateStackIdx < 1) {
    // Reset to the initial drawing state if the stack index is invalid
    window.resetDrawingState();
    // Set the stack index to 0, indicating no history
    window.drawingStateStackIdx = 0;
    return; // Exit the function after resetting
  }

  // Switch to the previous state in the history stack
  window.switchToHistoryState();
};

/**
 * Return nearest atom in drawingState within a given radius
 * @param {number} x - X-coordinate of the point to check
 * @param {number} y - Y-coordinate of the point to check
 * @param {number} r - Max radius within which to find the nearest atom
 * @return {DrawingAtom} nearest atom within the radius, or null if none exists
 */
function findNearestAtom(x, y, r) {
  let nearestAtom = null; // Initialize variable to store the nearest atom
  let nearestDis = Number.POSITIVE_INFINITY; // Initialize variable to store the shortest distance, set to infinity

  // Iterate through all atoms in the drawing state
  for (let atom of window.drawingState.atoms) {
    // Calculate the distance from the point (x, y) to the atom's position
    let cdis = distance(atom.x, atom.y, x, y);

    // Check if the distance is within the radius and if it's the shortest found so far
    if (cdis <= r && cdis < nearestDis) {
      nearestAtom = atom; // Update the nearest atom
      nearestDis = cdis; // Update the shortest distance
    }
  }

  // Return the nearest atom found or null if no atom was within the radius
  return nearestAtom;
}

/**
 * Remove given atom and all associated bonds
 * @param {DrawingAtom} atom - The atom to be removed
 */
function removeAtom(atom) {
  // Remove the atom from the list of atoms in the drawing state
  window.drawingState.atoms = window.drawingState.atoms.filter(
    (x) => x.id !== atom.id
  );

  // Deselect the atom if it was previously selected
  window.drawingState.selectedAtom =
    window.drawingState.selectedAtom === atom.id
      ? null
      : window.drawingState.selectedAtom;

  // Remove all references to the atom from other atoms' connectTo sets
  window.drawingState.atoms.forEach((a) => {
    a.connectTo = new Set([...a.connectTo].filter((x) => x.id !== atom.id));
  });
}

/**
 * Check if the bond between two atoms is currently being hovered over and return the distance
 * @param {DrawnAtom} atom - The first atom of the bond
 * @param {DrawnAtom} other - The second atom of the bond
 * @return {number} distance - The distance from the mouse position to the bond
 */
function bondHoverDis(atom, other) {
  // Calculate the distance between the two atoms
  const two_norm = distance(other.x, other.y, atom.x, atom.y);

  // Compute the offset vectors based on the threshold and atom size
  const dx =
    ((ATOM_CLICK_DISTANCE_THRESHOLD + ATOM_SIZE) * (other.x - atom.x)) /
    two_norm;
  const dy =
    ((ATOM_CLICK_DISTANCE_THRESHOLD + ATOM_SIZE) * (other.y - atom.y)) /
    two_norm;

  // Compute the distance from the mouse position to the line segment representing the bond
  const d = pointLineDistance(
    window.uiState.mousePos[0], // Mouse X position
    window.uiState.mousePos[1], // Mouse Y position
    atom.x + dx, // Line start X position
    atom.y + dy, // Line start Y position
    other.x - dx, // Line end X position
    other.y - dy // Line end Y position
  );

  // Return the calculated distance
  return d;
}

/**
 * Remove currently hovered bonds based on mouse position
 * Does not update history API
 */
function removeHoveredBond() {
  let nearest_atoms = null; // Variable to store the pair of nearest atoms forming the bond
  let nearest_dis = Number.POSITIVE_INFINITY; // Variable to track the nearest distance

  // Iterate through all atoms in the drawing state
  for (let atom of window.drawingState.atoms) {
    // Iterate through all connected atoms (neighbors) for each atom
    for (let other of [...atom.connectTo]) {
      // Calculate the distance from the mouse to the bond between the two atoms
      const dis = bondHoverDis(atom, other);

      // Check if the distance is within the clickable threshold
      const isHover = dis < ATOM_CLICK_DISTANCE_THRESHOLD;

      // If the bond is hovered and closer than the previous nearest, update nearest_atoms and nearest_dis
      if (isHover && dis < nearest_dis) {
        nearest_dis = dis;
        nearest_atoms = [atom, other];
      }
    }
  }

  // If a pair of nearest atoms was found
  if (nearest_atoms !== null) {
    let atom = nearest_atoms[0]; // The first atom in the pair
    // Remove the bond to the second atom from the first atom's connectTo set
    atom.connectTo = new Set(
      [...atom.connectTo].filter((o) => o.id !== nearest_atoms[1].id)
    );
  }
}

/**
 * Classify central atom with VESPR theory
 * @param {DrawnAtom} atom Atom
 * @return {string[]} Array where the first element is the shape of the central atom
 * and the second element is the filename of the corresponding image
 */
function classifyVESPR(atom) {
  // Calculate the number of lone electron pairs (free electrons) around the atom
  const freeElectrons = (graphState.idToElectrons[atom?.id] || 0) / 2;

  // Calculate the number of bonds the atom forms
  const bonds = graphState.bondIdMap[atom?.id]?.length || 0;

  // Calculate the steric number (sum of bonds and lone pairs)
  const stericNumber = bonds + freeElectrons;

  // Classify the atom based on free electron pairs and steric number

  if (freeElectrons === 0 && stericNumber === 2)
    return ["Linear (0 pairs CN = 2)", "linear.png"];

  if (freeElectrons === 0 && stericNumber === 3)
    return ["Trigonal Planar", "trigonal-planar.png"];
  if (freeElectrons === 1 && stericNumber === 3)
    return ["Angled (1 pair CN = 3)", "angled.png"];
  if (freeElectrons === 2 && stericNumber === 3)
    return ["Linear (2 pairs CN = 3)", "linear-2.png"];

  if (freeElectrons === 0 && stericNumber === 4)
    return ["Tetrahedral", "tetrahedral.png"];
  if (freeElectrons === 1 && stericNumber === 4)
    return ["Trigonal pyramidal", "trigonal-pyramidal.png"];
  if (freeElectrons === 2 && stericNumber === 4)
    return ["Angled (2 pairs CN = 4)", "angled.png"];
  if (freeElectrons === 3 && stericNumber === 4)
    return ["Linear (3 pairs CN = 4)", "linear-2.png"];

  if (freeElectrons === 0 && stericNumber === 5)
    return ["Trigonal bipyramidal", "trigonal-bipyramidal.png"];
  if (freeElectrons === 1 && stericNumber === 5)
    return ["Seesaw (bisphenoidal)", "seesaw.png"];
  if (freeElectrons === 2 && stericNumber === 5) return ["T-shaped", "t.png"];
  if (freeElectrons === 3 && stericNumber === 5)
    return ["Linear (3 pairs CN = 5)", "linear.png"];

  if (freeElectrons === 0 && stericNumber === 6)
    return ["Octahedral", "octahedral.png"];
  if (freeElectrons === 1 && stericNumber === 6)
    return ["Square pyramidal", "square-pyramidal.png"];
  if (freeElectrons === 2 && stericNumber === 6)
    return ["Square planar", "square-planar.png"];

  if (freeElectrons === 0 && stericNumber === 7)
    return ["Pentagonal bipyramidal", "pentagonal-bipyramidal.png"];
  if (freeElectrons === 1 && stericNumber === 7)
    return ["Pentagonal pyramidal", "pentagonal-pyramidal.png"];
  if (freeElectrons === 2 && stericNumber === 7)
    return ["Pentagonal planar", "pentagonal-planar.png"];

  if (freeElectrons === 0 && stericNumber === 8)
    return ["Square antiprismatic", "square-antiprismatic.png"];
  if (freeElectrons === 0 && stericNumber === 9)
    return ["Tricapped trigonal prismatic", "tricapped.png"];

  // Default return value if no classification matches
  return ["Unknown", "sphere.png"];
}

// Add an event listener for the 'keyup' event on the document
document.addEventListener("keyup", (e) => {
  // Check if the key released is the 'Shift' key
  if (e.key === "Shift") {
    // Update the UI state to reflect that the 'Shift' key is no longer pressed
    window.uiState.isShiftDown = false;

    // Change the cursor style on the canvas to the default cursor
    canvas.style.cursor = "default";
  }
});

// Add an event listener for the 'keydown' event on the document
document.addEventListener("keydown", (e) => {
  // Check if the key pressed is the 'Shift' key
  if (e.key === "Shift") {
    // Update the UI state to reflect that the 'Shift' key is pressed
    window.uiState.isShiftDown = true;

    // Change the cursor style on the canvas to 'move'
    canvas.style.cursor = "move";
  }

  // Check if the 'Ctrl' key is pressed along with 'z' for undo operation
  if (e.key === "z" && e.ctrlKey) {
    // Call function to undo the last drawing state
    window.popDrawingState();
  }
  // Check if the 'Ctrl' key is pressed along with 'y' for redo operation
  else if (e.key === "y" && e.ctrlKey) {
    // Check if there are more states to redo
    if (window.drawingStateStackIdx + 1 <= window.drawingStateStack.length) {
      // Move to the next state in the stack and update drawing state
      window.drawingStateStackIdx++;
      window.switchToHistoryState();
    }
  }
  // Check if the key pressed is the 'Escape' key
  else if (e.key === "Escape") {
    // Close any open element selectors and modals
    window.closeElementSelector();
    document.getElementById("algo-modal").style.display = "none";

    // Deselect any currently selected atom
    window.drawingState.selectedAtom = null;
  }
});

// Add an event listener for the 'mousemove' event on the canvas
canvas.addEventListener("mousemove", (e) => {
  // Update the mouse position in the UI state
  window.uiState.mousePos = [e.clientX, e.clientY];

  // Check if an atom is selected, Shift key is held down, and the mouse is being dragged
  if (
    window.drawingState.selectedAtom &&
    window.uiState.isShiftDown &&
    window.uiState.isMouseDown
  ) {
    // Update the position of the selected atom to follow the mouse
    window.drawingState.selectedAtom.x = e.clientX;
    window.drawingState.selectedAtom.y = e.clientY;

    // Update the graph state to reflect the changes
    window.updateGraphState();
  } else {
    // Otherwise, just redraw the canvas
    drawCanvas();
  }
});

// Add an event listener for the 'mousedown' event on the canvas
canvas.addEventListener("mousedown", (e) => {
  // Find the nearest atom to the mouse position within a specified distance
  window.drawingState.selectedAtom = findNearestAtom(
    e.clientX,
    e.clientY,
    ATOM_CLICK_DISTANCE_THRESHOLD
  );

  // Record the starting position of the drag operation
  window.drawingState.startDragLoc = [e.clientX, e.clientY];

  // Set the flag indicating that the mouse is being pressed down
  window.uiState.isMouseDown = true;

  // Check if Shift key is not held down, an atom is selected, and a charge element is selected
  if (
    !window.uiState.isShiftDown &&
    window.drawingState.selectedAtom &&
    window.selectedElement.startsWith("charge:")
  ) {
    // Extract the charge value from the selected element
    const val = window.selectedElement.split("charge:")[1];

    // Update the charge of the selected atom
    window.drawingState.selectedAtom.charge = +val;

    // Deselect the atom after updating the charge
    window.drawingState.selectedAtom = null;

    // Save the current drawing state to history
    window.pushDrawingState();
  }
});

// Add an event listener for the 'mouseup' event on the canvas
canvas.addEventListener("mouseup", (e) => {
  // Reset the flag indicating that the mouse is no longer being pressed down
  window.uiState.isMouseDown = false;

  // Determine if the mouse was dragged beyond a certain threshold
  const wasDragging =
    distance(...window.drawingState.startDragLoc, ...[e.clientX, e.clientY]) >
    DRAG_THRESHOLD;

  // If the mouse was dragged and the Shift key was held, deselect the atom
  if (wasDragging && window.uiState.isShiftDown)
    window.drawingState.selectedAtom = null;

  // Handle left mouse button click (button code 0)
  if (e.button === 0) {
    // If the mouse was dragged
    if (wasDragging) {
      // If no atom was selected during dragging, exit early
      if (!window.drawingState.selectedAtom) return;

      // Find the nearest atom to the end position of the drag
      let endAtom = findNearestAtom(
        e.clientX,
        e.clientY,
        ATOM_CLICK_DISTANCE_THRESHOLD
      );

      // If no atom found, deselect the previously selected atom and exit
      if (!endAtom) {
        window.drawingState.selectedAtom = null;
        return;
      }

      // Connect the currently selected atom to the nearest atom
      // By convention, connect the atom with the lower id to the higher id
      let startAtom = window.drawingState.selectedAtom;
      if (endAtom.id === startAtom.id) return; // Avoid connecting an atom to itself
      if (startAtom.id > endAtom.id)
        [startAtom, endAtom] = [endAtom, startAtom];

      // Re-find the atoms from the list (necessary due to undo/redo issues)
      startAtom = window.drawingState.atoms.filter(
        (atom) => atom.id === startAtom.id
      )[0];
      endAtom = window.drawingState.atoms.filter(
        (atom) => atom.id === endAtom.id
      )[0];

      // Add the connection between atoms
      startAtom.connectTo.add(endAtom);
      window.drawingState.selectedAtom = null; // Deselect the atom
      window.pushDrawingState(); // Save the current drawing state

      return;
    }
    // If no dragging occurred, add a new atom at the mouse position
    else if (!window.selectedElement.includes(":")) {
      window.drawingState.atoms.push(
        new DrawnAtom(
          e.clientX,
          e.clientY,
          window.selectedElement,
          window.drawingState.idCounter++
        )
      );
      window.pushDrawingState(); // Save the current drawing state
    }
  } else if (e.button === 2) {
    // Handle right mouse button click (button code 2)
    window.drawingState.selectedAtom = null; // Deselect any selected atom

    // If the mouse was dragged, do nothing
    if (wasDragging) return;

    // Find the nearest atom to the right-click position
    let endAtom = findNearestAtom(
      e.clientX,
      e.clientY,
      ATOM_CLICK_DISTANCE_THRESHOLD
    );

    // Remove the atom if found, otherwise remove the hovered bond
    if (endAtom) removeAtom(endAtom);
    else removeHoveredBond();

    // Save the current drawing state
    window.pushDrawingState();
  }
});

function drawCanvas() {
  // Clear the entire canvas to prepare for redrawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Set text alignment to center for any text drawing operations
  ctx.textAlign = "center";

  // Set the line width for drawing shapes and lines
  ctx.lineWidth = 3;

  // Check if there is a currently selected atom
  if (window.drawingState.selectedAtom) {
    // Set the stroke color for the selected atom's outline
    ctx.strokeStyle = "#3e5c8c";

    // Draw a line from the selected atom to the current mouse position
    line(
      ctx,
      window.drawingState.selectedAtom.x,
      window.drawingState.selectedAtom.y,
      window.uiState.mousePos[0],
      window.uiState.mousePos[1]
    );
  }

  let hoveredAtom = null; // Initialize variable to store the currently hovered atom

  // Loop through all atoms in the drawing state
  for (let atom of window.drawingState.atoms) {
    // Calculate the distance between the atom's position and the current mouse position
    let dis = distance(
      atom.x,
      atom.y,
      window.uiState.mousePos[0],
      window.uiState.mousePos[1]
    );

    // Check if the distance is less than the threshold for clicking
    if (dis < ATOM_CLICK_DISTANCE_THRESHOLD) {
      // If the atom is within the clickable distance, set it as the hovered atom
      hoveredAtom = atom;
      // Exit the loop since we found the atom closest to the mouse position
      break;
    }
  }

  // Classify the hovered atom using VESPR theory, if an atom is hovered
  const classify = hoveredAtom ? classifyVESPR(hoveredAtom) : [];

  // Update the VESPR display with the classification name or a default message
  document.getElementById("VESPR").innerText = hoveredAtom
    ? classify[0] // Classification name
    : "Hover an atom"; // Default message when no atom is hovered

  // Update the VESPR image based on the classification or a default image
  document.getElementById("VSPER-img").src = hoveredAtom
    ? "img/vsper/" + classify[1] // Classification image
    : "img/vsper/sphere.png"; // Default image when no atom is hovered

  // Render connections between atoms
  for (let atom of window.drawingState.atoms) {
    // Loop through each connection of the current atom
    for (let other of [...atom.connectTo]) {
      // Determine if the bond is being hovered over
      const isHover = bondHoverDis(atom, other) < ATOM_CLICK_DISTANCE_THRESHOLD;

      // Check if either atom in the bond is the hovered atom and if there are multiple bonds from the hovered atom
      const isAdjacentHover =
        (atom.id === hoveredAtom?.id || other.id === hoveredAtom?.id) &&
        (graphState.bondIdMap[hoveredAtom?.id] || []).length > 1;

      // Get the current strength of the bond
      const bondStrength = graphState.bondStrengthMap[`${atom.id},${other.id}`];

      // Set the color of the bond based on hover state
      ctx.strokeStyle = isHover
        ? "#69c3ff" // Light blue for hovered bonds
        : isAdjacentHover
        ? "#eb7434" // Orange for bonds adjacent to the hovered atom
        : "#333"; // Default color for other bonds

      // Draw the bond line with different styles based on bond strength
      if (!bondStrength || bondStrength === 1 || bondStrength === 3) {
        // Draw a single line for bonds with strength 1 or 3
        line(ctx, atom.x, atom.y, other.x, other.y);
      }

      if (bondStrength > 1) {
        // Draw multiple lines for bonds with strength greater than 1 (indicating double or triple bonds)
        let dis = distance(atom.x, atom.y, other.x, other.y);
        let offset = 6; // Offset for drawing parallel lines
        let dx = (-(atom.x - other.x) / dis) * offset;
        let dy = ((atom.y - other.y) / dis) * offset;

        // Draw the parallel lines for double or triple bonds
        line(ctx, atom.x - dy, atom.y - dx, other.x - dy, other.y - dx);
        line(ctx, atom.x + dy, atom.y + dx, other.x + dy, other.y + dx);
      }
    }
  }

  // Set the line width for drawing atoms
  ctx.lineWidth = 1;

  // Iterate over all atoms in the drawing state
  for (let atom of window.drawingState.atoms) {
    // Check if the atom is currently hovered
    let isHover = atom.id === hoveredAtom?.id;

    // Check if the atom is adjacent to the hovered atom and has multiple bonds
    let isAdjacentHover =
      (graphState.bondIdMap[hoveredAtom?.id] || []).includes(atom.id) &&
      (graphState.bondIdMap[hoveredAtom?.id] || []).length > 1;

    // Check if the atom is the currently selected atom
    let isFirst = atom.id === window.drawingState.selectedAtom?.id;

    // Set the fill color for the atom based on hover and adjacency
    ctx.fillStyle = isHover ? "#dbebff" : isAdjacentHover ? "#ffcdb3" : "white";

    // Set the stroke color and width for the atom based on hover and adjacency
    ctx.strokeStyle = isHover
      ? "#1a5196" // Dark blue for hovered atom
      : isAdjacentHover
      ? "#eb7434" // Orange for adjacent atoms
      : "black"; // Default color for other atoms
    ctx.lineWidth = isAdjacentHover ? 3 : 1; // Thicker line for adjacent atoms

    // Change the fill color for the selected atom
    if (isFirst) ctx.fillStyle = "#d1e3ff"; // Light blue for selected atom

    // Draw the atom as a circle
    circle(ctx, atom.x, atom.y, ATOM_SIZE);

    // Set the text color for the atom label based on hover and selection
    ctx.fillStyle = isHover ? "#12294d" : "black";
    if (isFirst) ctx.fillStyle = "#2d5696"; // Dark blue for selected atom

    // If the atom has associated electrons, set the fill color accordingly
    if (window.graphState.idToElectrons[atom.id]) {
      ctx.fillStyle = isHover ? "#12294d" : "#666"; // Dark color for hovered atoms with electrons
      if (isFirst) ctx.fillStyle = "#2d5696"; // Dark blue for selected atom with electrons

      // Define angles for drawing electron pairs around the atom
      const SMALL_ANGLE = (15 * Math.PI) / 180; // Small angle in radians
      const RIGHT_ANGLE = Math.PI / 2; // Right angle in radians
      const ELECTRON_ANGLES = [
        -SMALL_ANGLE,
        SMALL_ANGLE,
        Math.PI - SMALL_ANGLE,
        Math.PI + SMALL_ANGLE,
        RIGHT_ANGLE - SMALL_ANGLE,
        RIGHT_ANGLE + SMALL_ANGLE,
        -RIGHT_ANGLE - SMALL_ANGLE,
        -RIGHT_ANGLE + SMALL_ANGLE,
      ];

      for (
        let i = 0;
        i <
        Math.min(
          window.graphState.idToElectrons[atom.id] || 0, // Number of electrons associated with the atom
          ELECTRON_ANGLES.length // Maximum number of angles defined
        );
        i++
      ) {
        // Get the angle for the current electron pair
        const angle = ELECTRON_ANGLES[i];

        // Draw each electron as a small circle around the atom
        circle(
          ctx,
          atom.x + ATOM_SIZE * Math.cos(angle), // X position of the electron
          atom.y + ATOM_SIZE * Math.sin(angle), // Y position of the electron
          ELECTRON_SIZE // Size of the electron circle
        );
      }
    }

    ctx.fillStyle = isHover ? "#12294d" : "black";
    // Set the font style for the atom label
    ctx.font = `bold ${FONT_SIZE}px "Times New Roman"`;
    // Draw the atom type (e.g., "H", "O") at the atom's position
    ctx.fillText(atom.type, atom.x, atom.y + FONT_SIZE / 3);

    if (atom.charge) {
      // Adjust font style for charge label
      ctx.font = `normal ${FONT_SIZE / 2}px "Times New Roman"`;
      let acharge = Math.abs(atom.charge);
      // Format charge value to one decimal place if less than 1
      if (acharge < 1) acharge = acharge.toFixed(1);

      // Set fill color based on charge sign
      ctx.fillStyle = atom.charge < 0 ? "blue" : "red";
      // Draw the charge label (e.g., "+1" or "-1") above the atom
      ctx.fillText(
        atom.charge < 0 ? `${acharge}-` : `${acharge}+`,
        atom.x,
        atom.y - FONT_SIZE / 2
      );
    }
  }
}

// Time of the last canvas draw
let lastDrawTime = 0;
// Target frames per second (FPS) for drawing updates
const TARGET_FPS = 1;

function drawCanvasLoop() {
  // Check if the time since the last draw is greater than the target interval
  if (Date.now() - lastDrawTime > 1000 / TARGET_FPS) {
    // Call the drawCanvas function to update the canvas
    drawCanvas();
    // Update the lastDrawTime to the current time
    lastDrawTime = Date.now();
  }
  // Request the next animation frame, creating a continuous loop
  requestAnimationFrame(drawCanvasLoop);
}

// Start the drawing loop
drawCanvasLoop();
