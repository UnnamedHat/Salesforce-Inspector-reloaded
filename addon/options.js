/* global React ReactDOM */
import {sfConn, apiVersion} from "./inspector.js";
/* global initButton */
import {DescribeInfo} from "./data-load.js";

class Model {

  constructor(sfHost) {
    this.sfHost = sfHost;

    this.sfLink = "https://" + this.sfHost;
    this.userInfo = "...";
    if (localStorage.getItem(sfHost + "_isSandbox") != "true") {
      //change background color for production
      document.body.classList.add("prod");
    }

    this.describeInfo = new DescribeInfo(this.spinFor.bind(this), () => { });
    this.spinFor(sfConn.soap(sfConn.wsdl(apiVersion, "Partner"), "getUserInfo", {}).then(res => {
      this.userInfo = res.userFullName + " / " + res.userName + " / " + res.organizationName;
    }));
  }

  /**
   * Notify React that we changed something, so it will rerender the view.
   * Should only be called once at the end of an event or asynchronous operation, since each call can take some time.
   * All event listeners (functions starting with "on") should call this function if they update the model.
   * Asynchronous operations should use the spinFor function, which will call this function after the asynchronous operation completes.
   * Other functions should not call this function, since they are called by a function that does.
   * @param cb A function to be called once React has processed the update.
   */
  didUpdate(cb) {
    if (this.reactCallback) {
      this.reactCallback(cb);
    }
    if (this.testCallback) {
      this.testCallback();
    }
  }

  /**
   * Show the spinner while waiting for a promise.
   * didUpdate() must be called after calling spinFor.
   * didUpdate() is called when the promise is resolved or rejected, so the caller doesn't have to call it, when it updates the model just before resolving the promise, for better performance.
   * @param promise The promise to wait for.
   */
  spinFor(promise) {
    this.spinnerCount++;
    promise
      .catch(err => {
        console.error("spinFor", err);
      })
      .then(() => {
        this.spinnerCount--;
        this.didUpdate();
      })
      .catch(err => console.log("error handling failed", err));
  }

}

class OptionsTabSelector extends React.Component {
  constructor(props) {
    super(props);
    this.model = props.model;
    this.state = {
      selectedTabId: 1
    };
    this.tabs = [
      {
        id: 1,
        tabTitle: "Tab1",
        title: "User Experience",
        content: [
          {option: ArrowButtonOption, props: {key: 1}},
          {option: CheckboxToggle, props: {title: "Flow Scrollability", key: "scrollOnFlowBuilder"}},
          {option: CheckboxToggle, props: {title: "Inspect page - Show table borders", key: "displayInspectTableBorders"}},
          {option: CheckboxToggle, props: {title: "Always open links in a new tab", key: "openLinksInNewTab"}},
          {option: CheckboxToggle, props: {title: "Open Permission Set / Permission Set Group summary from shortcuts", key: "enablePermSetSummary"}},
          {option: CheckboxToggle, props: {title: "Search metadata from Shortcut tab", key: "metadataShortcutSearch"}},
          {option: CheckboxToggle, props: {title: "Disable query input autofocus", key: "disableQueryInputAutoFocus"}}
        ]
      },
      {
        id: 2,
        tabTitle: "Tab2",
        title: "API",
        content: [
          {option: APIVersionOption, props: {key: 1}},
          {option: APIKeyOption, props: {key: 2}},
          {option: RestHeaderOption, props: {key: 3}}
        ]
      },
      {
        id: 3,
        tabTitle: "Tab3",
        title: "Data Export",
        content: [
          {option: CSVSeparatorOption, props: {key: 1}},
          {option: CheckboxToggle, props: {title: "Display Query Execution Time", key: "displayQueryPerformance", default: true}}
        ]
      },
      {
        id: 4,
        tabTitle: "Tab4",
        title: "Enable Logs",
        content: [
          {option: enableLogsOption, props: {key: 1}}
        ]
      },
      {
        id: 5,
        tabTitle: "Tab5",
        title: "User Interface",
        content: [
          {option: ColorSchemeOption, key: 1},
          {option: ColorAccentOption, key: 2}
        ]
      }
    ];
    this.onTabSelect = this.onTabSelect.bind(this);
  }

  onTabSelect(e) {
    e.preventDefault();
    this.setState({selectedTabId: e.target.tabIndex});
  }

  render() {
    return h("div", {className: "slds-tabs_default"},
      h("ul", {className: "options-tab-container slds-tabs_default__nav", role: "tablist"},
        this.tabs.map((tab) => h(OptionsTab, {key: tab.id, title: tab.title, id: tab.id, selectedTabId: this.state.selectedTabId, onTabSelect: this.onTabSelect}))
      ),
      this.tabs.map((tab) => h(OptionsContainer, {key: tab.id, id: tab.id, content: tab.content, selectedTabId: this.state.selectedTabId, model: this.model}))
    );
  }
}

class OptionsTab extends React.Component {

  getClass() {
    return "options-tab slds-text-align_center slds-tabs_default__item" + (this.props.selectedTabId === this.props.id ? " slds-is-active" : "");
  }

  render() {
    return h("li", {key: this.props.id, className: this.getClass(), title: this.props.title, tabIndex: this.props.id, role: "presentation", onClick: this.props.onTabSelect},
      h("a", {className: "slds-tabs_default__link", href: "#", role: "tab", tabIndex: this.props.id, id: "tab-default-" + this.props.id + "__item"},
        this.props.title)
    );
  }
}

class OptionsContainer extends React.Component {

  constructor(props) {
    super(props);
    this.model = props.model;
  }

  getClass() {
    return (this.props.selectedTabId === this.props.id ? "slds-show" : " slds-hide");
  }

  render() {
    return h("div", {id: this.props.id, className: this.getClass(), role: "tabpanel"}, this.props.content.map((c) => h(c.option, {storageKey: c.props?.key, ...c.props, model: this.model})));
  }

}

class ArrowButtonOption extends React.Component {

  constructor(props) {
    super(props);
    this.onChangeArrowOrientation = this.onChangeArrowOrientation.bind(this);
    this.onChangeArrowPosition = this.onChangeArrowPosition.bind(this);
    this.state = {
      arrowButtonOrientation: localStorage.getItem("popupArrowOrientation") ? localStorage.getItem("popupArrowOrientation") : "vertical",
      arrowButtonPosition: localStorage.getItem("popupArrowPosition") ? localStorage.getItem("popupArrowPosition") : "20"
    };
    this.timeout;
  }

  onChangeArrowOrientation(e) {
    let orientation = e.target.value;
    this.setState({arrowButtonOrientation: orientation});
    localStorage.setItem("popupArrowOrientation", orientation);
    window.location.reload();
  }

  onChangeArrowPosition(e) {
    let position = e.target.value;
    this.setState({arrowButtonPosition: position});
    console.log("[SFInspector] New Arrow Position Value: ", position);
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => {
      console.log("[SFInspector] Setting Arrow Position: ", position);
      localStorage.setItem("popupArrowPosition", position);
      window.location.reload();
    }, 1000);
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "slds-col slds-size_4-of-12 text-align-middle"},
        h("span", {}, "Popup arrow button orientation and position")
      ),
      h("div", {className: "slds-col slds-size_8-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"},
        h("label", {className: "slds-col slds-size_2-of-12 slds-text-align_right"}, "Orientation:"),
        h("select", {className: "slds-col slds-size_2-of-12 slds-combobox__form-element slds-input combobox-container", defaultValue: this.state.arrowButtonOrientation, name: "arrowPosition", id: "arrowPosition", onChange: this.onChangeArrowOrientation},
          h("option", {value: "horizontal"}, "Horizontal"),
          h("option", {value: "vertical"}, "Vertical")
        ),
        h("label", {className: "slds-m-left_medium slds-col slds-size_2-of-12 slds-text-align_right", htmlFor: "arrowPositionSlider"}, "Position (%):"),
        h("div", {className: "slds-form-element__control slider-container slds-col slds-size_4-of-12"},
          h("div", {className: "slds-slider"},
            h("input", {type: "range", id: "arrowPositionSlider", className: "slds-slider__range", value: this.state.arrowButtonPosition, min: "0", max: "100", step: "1", onChange: this.onChangeArrowPosition}),
            h("span", {className: "slds-slider__value", "aria-hidden": true}, this.state.arrowButtonPosition)
          )
        )
      )
    );
  }
}

class APIVersionOption extends React.Component {

  constructor(props) {
    super(props);
    this.onChangeApiVersion = this.onChangeApiVersion.bind(this);
    this.state = {apiVersion: localStorage.getItem("apiVersion") ? localStorage.getItem("apiVersion") : apiVersion};
  }

  onChangeApiVersion(e) {
    let apiVersion = e.target.value;
    this.setState({apiVersion});
    localStorage.setItem("apiVersion", apiVersion + ".0");
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "slds-col slds-size_4-of-12 text-align-middle"},
        h("span", {}, "API Version")
      ),
      h("div", {className: "slds-col slds-size_7-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"}),
      h("div", {className: "slds-col slds-size_1-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"},
        h("div", {className: "slds-form-element__control slds-col slds-size_2-of-12"},
          h("input", {type: "number", required: true, id: "apiVersionInput", className: "slds-input", value: this.state.apiVersion.split(".0")[0], onChange: this.onChangeApiVersion}),
        )
      )
    );
  }
}

class RestHeaderOption extends React.Component {

  constructor(props) {
    super(props);
    this.onChangeRestHeader = this.onChangeRestHeader.bind(this);
    this.state = {restHeader: localStorage.getItem("createUpdateRestCalloutHeaders") ? localStorage.getItem("createUpdateRestCalloutHeaders") : ""};
  }

  onChangeRestHeader(e) {
    let restHeader = e.target.value;
    this.setState({restHeader});
    localStorage.setItem("createUpdateRestCalloutHeaders", restHeader);
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "slds-col slds-size_4-of-12 text-align-middle"},
        h("span", {}, "Rest Header")
      ),
      h("div", {className: "slds-col slds-size_2-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"},
        h("div", {className: "slds-form-element__control slds-col slds-size_6-of-12"},
          h("input", {type: "text", id: "restHeaderInput", className: "slds-input", placeholder: "Rest Header", value: this.state.restHeader, onChange: this.onChangeRestHeader}),
        )
      )
    );
  }
}
// {storageKey: unique identifier for localStorage and rendered element, title: label for the toggle, default (optional): default value for the toggle (true or false, default is false)}
class CheckboxToggle extends React.Component {
  constructor(props) {
    super(props);
    this.onChange = this.onChange.bind(this);
    this.key = props.storageKey;
    // storage will be string "true" or "false", prop must be actual boolean
    let value = localStorage.getItem(this.key);
    if (props.default !== undefined && value === null) {
      value = JSON.stringify(props.default);
      localStorage.setItem(this.key, value);
    }
    this.state = {enabled: !!JSON.parse(value)};
    this.title = props.title;
  }

  onChange(e) {
    const enabled = e.target.checked;
    this.setState({enabled});
    localStorage.setItem(this.key, JSON.stringify(enabled));
  }

  render() {
    const id = this.key;
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "slds-col slds-size_4-of-12 text-align-middle"},
        h("span", {}, this.title)
      ),
      h("div", {className: "slds-col slds-size_7-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"}),
      h("div", {dir: "rtl", className: "slds-form-element__control slds-col slds-size_1-of-12 slds-p-right_medium"},
        h("label", {className: "slds-checkbox_toggle slds-grid"},
          h("input", {type: "checkbox", required: true, id, "aria-describedby": id, className: "slds-input", checked: this.state.enabled, onChange: this.onChange}),
          h("span", {id, className: "slds-checkbox_faux_container center-label"},
            h("span", {className: "slds-checkbox_faux"}),
            h("span", {className: "slds-checkbox_on"}, "Enabled"),
            h("span", {className: "slds-checkbox_off"}, "Disabled"),
          )
        )
      )
    );
  }
}

class ColorSchemeOption extends React.Component {
  constructor(props) {
    super(props);
    this.setupThemeChange();
    this.setupThemeListeners();
    this.onThemeChange = this.onThemeChange.bind(this);
    this.onThemeClick = this.onThemeClick.bind(this);
    this.setupThemeListeners = this.setupThemeListeners.bind(this);
    this.updateTheme = this.updateTheme.bind(this);
  }

  saveThemeChanges(theme) {
    const html = document.documentElement;
    html.dataset.theme = theme;
    localStorage.setItem("preferredColorScheme", theme);

    const popup = document.querySelector("#insext > iframe");
    popup.contentWindow.postMessage({category: "theme", value: theme}, "*");
  }

  setupThemeListeners() {
    const html = document.documentElement;
    const popup = document.querySelector("#insext > iframe");
    const mainCategory = "theme";
    const changeColor = (value) => {
      const htmlValue = html.dataset[mainCategory];
      if (value != htmlValue) { // avoid recursion
        const inputField = document.getElementById("checkbox-toggle-themeChange");
        inputField.checked = !inputField.checked;
        this.updateTheme(value, false);
      }
    };

    // listen to possible updates from popup
    window.addEventListener("message", e => {
      if (e.source != popup.contentWindow) {
        return;
      }
      if (e.data.category && e.data.value) {
        const category = e.data.category;
        if (category !== mainCategory) {
          return;
        }
        const value = e.data.value;
        changeColor(value);
      }
    });

    // listen to changes on other pages of the inspector
    window.addEventListener("storage", e => {
      if (!e.isTrusted || e.key !== "preferredColorScheme") {
        return;
      }
      const value = e.newValue;
      changeColor(value);
    });
  }

  updateTheme(theme, isSetup = false) {
    const light = document.getElementById("light-theme");
    const dark = document.getElementById("dark-theme");
    const inputField = document.getElementById("checkbox-toggle-themeChange");
    if (light == null || dark == null || inputField == null) {
      setTimeout(() => this.updateTheme(theme, isSetup), 500);
      return;
    }
    this.saveThemeChanges(theme, isSetup);

    if (isSetup) {
      const isDarkTheme = theme === "dark";
      isDarkTheme ? dark.classList.remove("hide") : light.classList.remove("hide");
      inputField.checked = isDarkTheme;
    } else {
      light.classList.toggle("hide");
      dark.classList.toggle("hide");
    }
  }

  setupThemeChange() {
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    function getTheme(mediaQuery) {
      return mediaQuery.matches ? "dark" : "light";
    }
    // listen for changes to color scheme preference
    prefersDarkScheme.addEventListener("change", mediaQuery => {
      const theme = getTheme(mediaQuery);
      this.updateTheme(theme, false);
    });

    const savedTheme = localStorage.getItem("preferredColorScheme") || getTheme(prefersDarkScheme);
    this.updateTheme(savedTheme, true);
  }

  onThemeChange() {
    const html = document.documentElement;
    const theme = html.dataset.theme === "light" ? "dark" : "light";
    this.updateTheme(theme, false);
  }

  onThemeClick() {
    const inputField = document.getElementById("checkbox-toggle-themeChange");
    if (inputField == null) return;
    this.onThemeChange();
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "text-align-middle slds-grid slds-grid_vertical-align-center", style: {flexDirection: "row"}},
        h("span", {style: {marginRight: "0.5rem"}}, "Set default theme to "),
        h("img", {id: "dark-theme", src: "images/moon.svg", className: "hide", height: "20px", width: "20px", onClick: this.onThemeClick, title: "Dark scheme selected.", style: {filter: "invert(100%)"}}),
        h("img", {id: "light-theme", src: "images/sun.svg", className: "hide", height: "20px", width: "20px", onClick: this.onThemeClick, title: "Light scheme selected."})
      ),
      h("div", {className: "slds-col slds-size_7-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"}),
      h("div", {dir: "rtl", className: "slds-form-element__control slds-col slds-size_1-of-12 slds-p-right_medium"},
        h("label", {className: "slds-checkbox_toggle slds-grid"},
          h("input", {type: "checkbox", required: true, id: "checkbox-toggle-themeChange", "aria-describedby": "checkbox-toggle-themeDescription", className: "slds-input", onChange: this.onThemeChange}),
          h("span", {id: "checkbox-toggle-themeDescription", className: "slds-checkbox_faux_container center-label"},
            h("span", {className: "slds-checkbox_faux"}),
            h("span", {className: "slds-checkbox_on"}, "Dark"),
            h("span", {className: "slds-checkbox_off"}, "Light"),
          )
        )
      )
    );
  }
}

class ColorAccentOption extends React.Component {
  constructor(props) {
    super(props);
    this.setupAccentOption();
    this.setupAccentListeners();
    this.setupAccentListeners = this.setupAccentListeners.bind(this);
    this.updateAccent = this.updateAccent.bind(this);
    this.onDefault = this.onDefault.bind(this);
    this.onAccent = this.onAccent.bind(this);
  }

  updateDocument(accent) {
    const html = document.documentElement;
    html.dataset.accent = accent;
    localStorage.setItem("preferredAccentScheme", accent);

    const popup = document.querySelector("#insext > iframe");
    popup.contentWindow.postMessage({category: "accent", value: accent}, "*");
  }

  setupAccentListeners() {
    const html = document.documentElement;
    const popup = document.querySelector("#insext > iframe");
    const mainCategory = "accent";
    const changeColor = (value) => {
      const htmlValue = html.dataset[mainCategory];
      if (value != htmlValue) { // avoid recursion
        this.updateDocument(value);
      }
    };

    // listen to possible updates from popup
    window.addEventListener("message", e => {
      if (e.source != popup.contentWindow) {
        return;
      }
      if (e.data.category && e.data.value) {
        const category = e.data.category;
        if (category !== mainCategory) {
          return;
        }
        const value = e.data.value;
        changeColor(value);
      }
    });

    // listen to changes on other pages of the inspector
    window.addEventListener("storage", e => {
      if (!e.isTrusted || e.key !== "preferredAccentScheme") {
        return;
      }
      const value = e.newValue;
      changeColor(value);
    });
  }

  setupAccentOption() {
    const defPick = document.getElementById("inspector-pick-default");
    const accPick = document.getElementById("inspector-pick-accent");
    if (defPick == null || accPick == null) {
      setTimeout(() => this.setupAccentOption(), 500);
      return;
    }

    const accent = localStorage.getItem("preferredAccentScheme") || "default";
    const isDefault = accent === "default";

    isDefault ? defPick.classList.add("selected") : accPick.classList.add("selected");
    this.updateDocument(accent);
  }

  updateAccent(newAccent) {
    // change the classes of the previews below
    const defPick = document.getElementById("inspector-pick-default");
    const accPick = document.getElementById("inspector-pick-accent");
    if (defPick == null || accPick == null) {
      setTimeout(() => this.updateAccent(newAccent), 500);
      return;
    }

    const defSelected = defPick.classList.contains("selected");
    const isDefault = newAccent === "default";
    if (isDefault == defSelected) {
      // the same preview has been clicked
      return;
    }

    defPick.classList.toggle("selected");
    accPick.classList.toggle("selected");
    this.updateDocument(newAccent);
  }

  onDefault() {
    this.updateAccent("default");
  }

  onAccent() {
    this.updateAccent("accent");
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "text-align-middle slds-grid slds-grid_vertical-align-center", style: {flexDirection: "row"}},
        h("span", {style: {marginRight: "0.5rem"}}, "Pick your favourite color accent."),
      ),

      h("div", {className: "slds-col slds-size_5-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"}),

      h("div", {id: "preview-holder"},
        h("label", {},
          h("div", {id: "inspector-pick-default", className: "default", "aria-describedby": "accent-default", onClick: this.onDefault},
            h("span", {id: "accent-default"}, "Default")
          )
        ),
        h("label", {},
          h("div", {id: "inspector-pick-accent", className: "accent", "aria-describedby": "accent-accent", onClick: this.onAccent},
            h("span", {id: "accent-accent"}, "Accent")
          )
        )
      )
    );
  }
}

class APIKeyOption extends React.Component {

  constructor(props) {
    super(props);
    this.sfHost = props.model.sfHost;
    this.onChangeApiKey = this.onChangeApiKey.bind(this);
    this.state = {apiKey: localStorage.getItem(this.sfHost + "_clientId") ? localStorage.getItem(this.sfHost + "_clientId") : ""};
  }

  onChangeApiKey(e) {
    let apiKey = e.target.value;
    this.setState({apiKey});
    localStorage.setItem(this.sfHost + "_clientId", apiKey);
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "slds-col slds-size_4-of-12 text-align-middle"},
        h("span", {}, "API Consumer Key")
      ),
      h("div", {className: "slds-col slds-size_2-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"},
        h("div", {className: "slds-form-element__control slds-col slds-size_6-of-12"},
          h("input", {type: "text", id: "apiKeyInput", className: "slds-input", placeholder: "Consumer Key", value: this.state.apiKey, onChange: this.onChangeApiKey}),
        )
      )
    );
  }
}

class CSVSeparatorOption extends React.Component {

  constructor(props) {
    super(props);
    this.onChangeCSVSeparator = this.onChangeCSVSeparator.bind(this);
    this.state = {csvSeparator: localStorage.getItem("csvSeparator") ? localStorage.getItem("csvSeparator") : ","};
  }

  onChangeCSVSeparator(e) {
    let csvSeparator = e.target.value;
    this.setState({csvSeparator});
    localStorage.setItem("csvSeparator", csvSeparator);
  }

  render() {
    return h("div", {className: "slds-grid slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
      h("div", {className: "slds-col slds-size_4-of-12 text-align-middle"},
        h("span", {}, "CSV Separator")
      ),
      h("div", {className: "slds-col slds-size_7-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"}),
      h("div", {className: "slds-col slds-size_1-of-12 slds-form-element slds-grid slds-grid_align-end slds-grid_vertical-align-center slds-gutters_small"},
        h("input", {type: "text", id: "csvSeparatorInput", className: "slds-input slds-text-align_right slds-m-right_small", placeholder: "CSV Separator", value: this.state.csvSeparator, onChange: this.onChangeCSVSeparator})
      )
    );
  }
}

class enableLogsOption extends React.Component {

  constructor(props) {
    super(props);
    this.sfHost = props.model.sfHost;
    this.onChangeDebugLogTime = this.onChangeDebugLogTime.bind(this);
    this.onChangeDebugLevel = this.onChangeDebugLevel.bind(this);
    this.state = {
      debugLogDebugLevel: localStorage.getItem(this.sfHost + "_debugLogDebugLevel") ? localStorage.getItem(this.sfHost + "_debugLogDebugLevel") : "SFDC_DevConsole",
      debugLogTimeMinutes: localStorage.getItem("debugLogTimeMinutes") ? localStorage.getItem("debugLogTimeMinutes") : "15",
    };
  }

  onChangeDebugLevel(e) {
    let debugLogDebugLevel = e.target.value;
    this.setState({debugLogDebugLevel});
    localStorage.setItem(this.sfHost + "_debugLogDebugLevel", debugLogDebugLevel);
  }

  onChangeDebugLogTime(e) {
    let debugLogTimeMinutes = e.target.value;
    this.setState({debugLogTimeMinutes});
    localStorage.setItem("debugLogTimeMinutes", debugLogTimeMinutes);
  }

  render() {
    return h("div", {className: "slds-grid slds-grid_vertical"},
      h("div", {className: "slds-col slds-grid slds-wrap slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
        h("div", {className: "slds-col slds-size_3-of-12 text-align-middle"},
          h("span", {}, "Debug Level (DeveloperName)")
        ),
        h("div", {className: "slds-col slds-size_6-of-12 slds-form-element"}),
        h("div", {className: "slds-col slds-size_3-of-12 slds-form-element"},
          h("input", {type: "text", id: "debugLogDebugLevel", className: "slds-input slds-text-align_right slds-m-right_small", placeholder: "SFDC_DevConsole", value: this.state.debugLogDebugLevel, onChange: this.onChangeDebugLevel})
        ),
      ),
      h("div", {className: "slds-col slds-grid slds-wrap slds-border_bottom slds-p-horizontal_small slds-p-vertical_xx-small"},
        h("div", {className: "slds-col slds-size_3-of-12 text-align-middle"},
          h("span", {}, "Debug Log Time (Minutes)")
        ),
        h("div", {className: "slds-col slds-size_6-of-12 slds-form-element"}),
        h("div", {className: "slds-col slds-size_3-of-12 slds-form-element"},
          h("input", {type: "number", id: "debugLogTimeMinutes", className: "slds-input slds-text-align_right slds-m-right_small", value: this.state.debugLogTimeMinutes, onChange: this.onChangeDebugLogTime})
        ),
      )
    );
  }
}

let h = React.createElement;

class App extends React.Component {
  render() {
    let {model} = this.props;
    return h("div", {},
      h("div", {id: "user-info", className: "slds-border_bottom"},
        h("a", {href: model.sfLink, className: "sf-link"},
          h("svg", {viewBox: "0 0 24 24"},
            h("path", {d: "M18.9 12.3h-1.5v6.6c0 .2-.1.3-.3.3h-3c-.2 0-.3-.1-.3-.3v-5.1h-3.6v5.1c0 .2-.1.3-.3.3h-3c-.2 0-.3-.1-.3-.3v-6.6H5.1c-.1 0-.3-.1-.3-.2s0-.2.1-.3l6.9-7c.1-.1.3-.1.4 0l7 7v.3c0 .1-.2.2-.3.2z"})
          ),
          " Salesforce Home"
        ),
        h("h1", {className: "slds-text-title_bold"}, "Salesforce Inspector Options"),
        h("span", {}, " / " + model.userInfo),
        h("div", {className: "flex-right"})),
      h("div", {className: "main-container slds-card slds-m-around_small"},
        h(OptionsTabSelector, {model}))
    );
  }
}

{

  let args = new URLSearchParams(location.search.slice(1));
  let sfHost = args.get("host");
  initButton(sfHost, true);
  sfConn.getSession(sfHost).then(() => {

    let root = document.getElementById("root");
    let model = new Model(sfHost);
    model.reactCallback = cb => {
      ReactDOM.render(h(App, {model}), root, cb);
    };
    ReactDOM.render(h(App, {model}), root);

    if (parent && parent.isUnitTest) { // for unit tests
      parent.insextTestLoaded({model});
    }

  });

}
