App = {
  loading: false,
  contracts: {},

  load: async () => {
    console.log("App loading started...")
    try {
      await App.loadWeb3()
      await App.loadAccount()
      await App.loadContract()
      await App.render()
      console.log("App loaded successfully!")
    } catch (error) {
      console.error("Error loading app:", error)
    }
  },

  // https://medium.com/metamask/https-medium-com-metamask-breaking-change-injecting-web3-7722797916a8
  loadWeb3: async () => {
    console.log("Loading Web3...")
    // Modern dapp browsers...
    if (window.ethereum) {
      App.web3Provider = window.ethereum
      web3 = new Web3(window.ethereum)
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' })
        console.log("MetaMask connected")
      } catch (error) {
        console.error("User denied account access")
        throw error
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      App.web3Provider = web3.currentProvider
      web3 = new Web3(web3.currentProvider)
      console.log("Legacy web3 detected")
    }
    // Non-dapp browsers...
    else {
      console.log('Non-Ethereum browser detected. You should consider trying MetaMask!')
      alert("Please install MetaMask to use this DApp!")
      throw new Error("MetaMask not found")
    }
  },

  loadAccount: async () => {
    console.log("Loading account...")
    try {
      // Set the current blockchain account
      const accounts = await new Promise((resolve, reject) => {
        web3.eth.getAccounts((error, accounts) => {
          if (error) {
            reject(error)
          } else {
            resolve(accounts)
          }
        })
      })
      
      App.account = accounts[0]
      console.log("Account loaded:", App.account)
      
      if (!App.account) {
        throw new Error("No accounts found. Make sure MetaMask is connected and unlocked.")
      }
    } catch (error) {
      console.error("Error loading account:", error)
      throw error
    }
  },

  loadContract: async () => {
    console.log("Loading contract...")
    try {
      // Create a JavaScript version of the smart contract
      const todoList = await $.getJSON('TodoList.json')
      App.contracts.TodoList = TruffleContract(todoList)
      App.contracts.TodoList.setProvider(App.web3Provider)

      // Hydrate the smart contract with values from the blockchain
      App.todoList = await App.contracts.TodoList.deployed()
      console.log("Contract loaded successfully")
    } catch (error) {
      console.error("Error loading contract:", error)
      throw error
    }
  },

  render: async () => {
    // Prevent double render
    if (App.loading) {
      return
    }

    // Update app loading state
    App.setLoading(true)

    // Render Account
    $('#account').html(App.account)

    // Render Tasks
    await App.renderTasks()

    // Update loading state
    App.setLoading(false)
  },

  renderTasks: async () => {
    console.log("Rendering tasks...")
    try {
      // Load the total task count from the blockchain
      const taskCount = await App.todoList.taskCount()
      const $taskTemplate = $('.taskTemplate')
      
      console.log("Task count:", taskCount.toString())

      // Render out each task with a new task template
      for (var i = 1; i <= taskCount; i++) {
        // Fetch the task data from the blockchain
        const task = await App.todoList.tasks(i)
        const taskId = task[0].toNumber()
        const taskContent = task[1]
        const taskCompleted = task[2]

        console.log(`Task ${taskId}: ${taskContent}, completed: ${taskCompleted}`)

        // Create the html for the task
        const $newTaskTemplate = $taskTemplate.clone()
        $newTaskTemplate.find('.content').html(taskContent)
        $newTaskTemplate.find('input')
                        .prop('name', taskId)
                        .prop('checked', taskCompleted)
                        .on('click', App.toggleCompleted)

        // Put the task in the correct list
        if (taskCompleted) {
          $('#completedTaskList').append($newTaskTemplate)
        } else {
          $('#taskList').append($newTaskTemplate)
        }

        // Show the task
        $newTaskTemplate.show()
      }
    } catch (error) {
      console.error("Error rendering tasks:", error)
    }
  },

  createTask: async () => {
    App.setLoading(true)
    const content = $('#newTask').val()
    await App.todoList.createTask(content)
    window.location.reload()
  },

  toggleCompleted: async (e) => {
    App.setLoading(true)
    const taskId = e.target.name
    await App.todoList.toggleCompleted(taskId)
    window.location.reload()
  },

  setLoading: (boolean) => {
    App.loading = boolean
    const loader = $('#loader')
    const content = $('#content')
    if (boolean) {
      loader.show()
      content.hide()
    } else {
      loader.hide()
      content.show()
    }
  }
}

$(() => {
  $(window).load(() => {
    App.load()
  })
})