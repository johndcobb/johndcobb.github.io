/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function buttonPress() {
    document.getElementById("myDropdown").classList.toggle("show");
    document.getElementById("myDropdownBtn").classList.add("press");
  }
  
  // Close the dropdown menu if the user clicks outside of it
  window.onclick = function(event) {
    if (!event.target.matches('.dropdown-button')) {
      var dropdowns = document.getElementsByClassName("dropdown-content");
      var buttons = document.getElementsByClassName("dropdown-button");
      var i;
      for (i = 0; i < dropdowns.length; i++) {
        var openDropdown = dropdowns[i];
        var openButton = buttons[i];
        if (openDropdown.classList.contains('show')) {
          openDropdown.classList.remove('show');
        }
        if (openButton.classList.contains('press')) {
            openButton.classList.remove('press');
        }
      }
    }
  }