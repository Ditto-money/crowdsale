const CONTRACT_ADDRESS = ~window.location.href.indexOf('testnet')
  ? '0xB5198CeC249A98c29250c0E62D45749e20feC307'
  : '0xB5198CeC249A98c29250c0E62D45749e20feC307'

// App - app object
App = {
  contracts: {},
  loading: false,
  load: async () => {
    await App.loadWeb3()
    await App.loadAccount()
    await App.loadContract()
    await App.render()
  },

  loadWeb3: async () => {
    if (typeof web3 !== 'undefined') {
      App.web3Provider = web3.currentProvider
      web3 = new Web3(web3.currentProvider)
    } else {
      console.log('Please connect to Metamask.')
    }
    // Modern dapp browsers...
    if (window.ethereum) {
      window.web3 = new Web3(ethereum)
      try {
        // Request account access if needed
        await ethereum.enable()
      } catch (error) {
        // User denied account access...
      }
    }
    // Legacy dapp browsers...
    else if (window.web3) {
      window.web3 = new Web3(web3.currentProvider)
    }
    // Non-dapp browsers...
    else {
      console.log(
        'Non-Ethereum browser detected. You should consider trying MetaMask!'
      )
    }
  },

  loadAccount: async () => {
    web3.eth.getCoinbase(function (error, account) {
      if (error === null) {
        App.account = account
        console.log('Connected Account: ', account)
      } else {
        App.account = ''
        console.log(error)
      }
      App.setAccountAddress()
    })
  },

  loadContract: async () => {
    const abi = await $.getJSON('CrowdSale.json')

    App.contracts.CrowdSaleContract = TruffleContract({
      abi: abi,
      address: CONTRACT_ADDRESS,
    })

    App.contracts.CrowdSaleContract.setProvider(App.web3Provider)

    App.CrowdSaleInstance = await App.contracts.CrowdSaleContract.at(
      CONTRACT_ADDRESS
    )
  },

  render: async () => {
    if (App.loading) {
      return
    }

    App.setLoading(true)
    App.setAccountAddress()
    await Promise.all([App.checkIsActive(), App.setRemainingTokens()])
    App.toggleBuyButton()
    App.setLoading(false)
  },

  setAccountAddress() {
    const address = App.account
    const shortAddress =
      address && `${address.slice(0, 6)}....${address.slice(-4)}`
    $('#account').html(shortAddress)
  },

  async checkIsActive() {
    this.isActive = await App.CrowdSaleInstance.isSaleActive()
  },

  setRemainingTokens: async () => {
    let result = (await App.CrowdSaleInstance.remainingTokens()).toNumber()
    const remainingTokens = (result / 10 ** 9).toFixed(9)

    $('#remainingTokens').html(remainingTokens)
  },

  calculateReceiveAmount: async () => {
    let inputAmount = $('#input-amount').val()
    if (inputAmount) {
      let inputAmountInWei = web3.toWei(parseFloat(inputAmount))
      try {
        let result = (
          await App.CrowdSaleInstance._getTokenAmount(inputAmountInWei)
        ).toNumber()
        const receiveAmount = (result / 10 ** 9).toFixed(9)
        $('#receive-amount').val(receiveAmount)
      } catch (error) {
        console.error(error)
        alert('An error occurred. Please see the console!')
        $('#receive-amount').val('')
      }
    } else {
      $('#receive-amount').val('')
    }
  },

  buyTokens: async () => {
    if (!this.isActive) {
      return alert('Sale is not active.')
    }
    let inputAmount = $('#input-amount').val()
    if (inputAmount) {
      let inputAmountInWei = web3.toWei(parseFloat(inputAmount))
      try {
        App.setLoading(true, true)
        await App.CrowdSaleInstance.buyTokens(App.account, {
          from: App.account,
          value: inputAmountInWei,
        })
        App.setLoading(false)
        console.log('buyTokens transaction executed')
        $('input').trigger('reset')
      } catch (error) {
        console.error(error)
        alert('An error occurred. Please see the console!')
        App.setLoading(false)
      }
    } else {
      return
    }
  },

  toggleBuyButton: () => {
    if (App.account) {
      $('#connect-wallet-btn').hide()
      $('#buy-btn').show()
    } else {
      $('#connect-wallet-btn').show()
      $('#buy-btn').hide()
    }
    if (!this.isActive) {
      $('#buy-btn').text('Sale is not active')
    }
  },

  setLoading: (loading, txnProcessing = false) => {
    App.loading = loading

    if (App.loading) {
      $('#loader').show()
      $('#content').hide()
      if (txnProcessing) {
        $('#txn-processing-msg').show()
      }
    } else {
      $('#loader').hide()
      $('#txn-processing-msg').hide()
      $('#content').show()
    }
  },

  reload: async () => {
    App.account = ''
    await App.loadAccount()
    await App.render()
  },
}

$(async () => {
  //   $(window).on('load', async () => {
  await App.load()
  ethereum.on('accountsChanged', async function (accounts) {
    await App.reload()
  })
  // })
})
