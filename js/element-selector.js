// Get the container element for the periodic table
// yaha se periodic table ka element mil raha hai
const tableContainer = document.getElementById("periodic-table");

// Iterate over the elements in the periodic_table array

// basically this loop is creating a button for each element of the periodic table

for (let i = 0; i < window.periodic_table.length; i++) {
  const el = window.periodic_table[i]; // Get the current element
  const btn = document.createElement("button"); // Create a new button element
  const periodicTableButtonWidth = 36; // Define the width for each button

  // Set the button's position based on the element's position in the table
  btn.style.position = "absolute";
  btn.style.left = el.xpos * periodicTableButtonWidth + "px";
  btn.style.top = el.ypos * periodicTableButtonWidth + "px";
  btn.style.width = periodicTableButtonWidth + "px";
  btn.style.height = periodicTableButtonWidth + "px";
  btn.style.fontSize = "11px"; // Set the font size for the button text
  // el-btn ka jo style style.css mein defined hai wo style iss button ke liye lag jayega
  btn.classList.add("el-btn"); // Add a class to the button for styling
  btn.title = el.name; // Set the tooltip to the element's name
  btn.innerText = el.symbol; // Set the button text to the element's symbol

  // Set the click event to update the selected element when the button is clicked
  // el.symbol jo hai wo current selected se update ho chuka hoga usi ko update kar rahe hai iss line mein
  btn.onclick = () => {
    // the function for this operation is given below
    window.updateSelectedElement(el.symbol);
  };

  // Append the button to the table container
  tableContainer.appendChild(btn);
}

// Get all the element buttons into an array
// saara elements ko ek array mein store kar liye
const elButtons = [...document.getElementsByClassName("el-btn")];

// Function to display the periodic table present on clicking the button
window.openElementSelector = () => {
  tableContainer.style.display = "block";
};

// Function to hide the periodic table on clicking the button
window.closeElementSelector = () => {
  tableContainer.style.display = "none";
};

// Function to update the selected element
window.updateSelectedElement = (el) => {
  document.getElementById("selected-element").innerText = el; // Update the displayed selected element

  // Highlight the selected button and un-highlight the others
  for (let elBtn of elButtons) {
    if (elBtn.innerText === el) elBtn.classList.add("selected");
    else elBtn.classList.remove("selected");
  }

  // Close the element selector and update the global selected element
  window.closeElementSelector();
  window.selectedElement = el;
};

// Set the default selected element to Hydrogen ('H')
window.selectedElement = "H";

// Get all the charge buttons into an array
const chargeButtons = [...document.getElementsByClassName("charge-btn")];

// Function to set the molecule charge and update the UI
window.setMoleculeCharge = (charge, update = true) => {
  window.graphState.moleculeCharge = charge; // Update the global graph state with the new charge

  // Highlight the selected charge button and un-highlight the others
  for (let cBtn of chargeButtons) {
    if (
      cBtn.innerText.includes(
        (charge < 0 ? "-" : charge > 0 ? "+" : "") + Math.abs(charge)
      )
    )
      cBtn.classList.add("selected");
    else cBtn.classList.remove("selected");
  }

  // Optionally update the graph state if the update parameter is true
  if (update) window.updateGraphState();
};

// Initialize the default molecule charge and selected element after a short delay
setTimeout(() => {
  window.setMoleculeCharge(0); // Set the molecule charge to 0
  window.updateSelectedElement("H"); // Set the selected element to Hydrogen
}, 10);
