const api = require('../../utils/api')
const storage = require('../../utils/storage')
const util = require('../../utils/util')
const logger = require('../../utils/logger')

Page({
  data: {
    family: null,
    members: [],
    loading: true,
    showCreateModal: false,
    showJoinModal: false,
    createName: '',
    joinCode: '',
  },

  onShow() {
    this.loadFamily()
  },

  loadFamily() {
    this.setData({ loading: true })
    api.getFamily()
      .then(data => {
        this.setData({
          family: data.family,
          members: data.members || [],
          loading: false,
        })
        if (data.family) {
          storage.updateSetting('familyId', data.family.id)
          storage.updateSetting('familyName', data.family.name)
        } else {
          storage.updateSetting('familyId', null)
          storage.updateSetting('familyName', null)
        }
      })
      .catch(() => {
        this.setData({ loading: false })
      })
  },

  showCreate() {
    this.setData({ showCreateModal: true, createName: '' })
  },

  hideCreate() {
    this.setData({ showCreateModal: false })
  },

  onCreateNameInput(e) {
    this.setData({ createName: e.detail.value })
  },

  confirmCreate() {
    const name = this.data.createName.trim()
    if (!name) { util.showToast('请输入家庭名称'); return }

    util.showLoading('创建中...')
    api.createFamily(name)
      .then(data => {
        util.hideLoading()
        util.showSuccess('家庭创建成功')
        logger.info('创建家庭', { familyId: data.family.id, code: data.family.code })
        this.setData({ showCreateModal: false })
        this.loadFamily()
      })
      .catch(err => {
        util.hideLoading()
        util.showError(err.message)
      })
  },

  showJoin() {
    this.setData({ showJoinModal: true, joinCode: '' })
  },

  hideJoin() {
    this.setData({ showJoinModal: false })
  },

  onJoinCodeInput(e) {
    this.setData({ joinCode: e.detail.value.toUpperCase() })
  },

  confirmJoin() {
    const code = this.data.joinCode.trim()
    if (!code) { util.showToast('请输入邀请码'); return }

    util.showLoading('加入中...')
    api.joinFamily(code)
      .then(data => {
        util.hideLoading()
        util.showSuccess('加入家庭成功')
        logger.info('加入家庭', { familyId: data.family.id })
        this.setData({ showJoinModal: false })
        this.loadFamily()
      })
      .catch(err => {
        util.hideLoading()
        util.showError(err.message)
      })
  },

  onLeaveFamily() {
    const self = this
    wx.showModal({
      title: '离开家庭',
      content: '确定离开当前家庭吗？您的账单仍会保留。',
      success(res) {
        if (res.confirm) {
          util.showLoading('操作中...')
          api.leaveFamily()
            .then(() => {
              util.hideLoading()
              util.showSuccess('已离开家庭')
              logger.info('离开家庭')
              self.loadFamily()
            })
            .catch(err => {
              util.hideLoading()
              util.showError(err.message)
            })
        }
      }
    })
  },

  onRemoveMember(e) {
    const target = e.currentTarget.dataset.member
    const self = this
    wx.showModal({
      title: '移除成员',
      content: '确定移除该成员吗？其账单仍会保留。',
      success(res) {
        if (res.confirm) {
          util.showLoading('操作中...')
          api.removeFamilyMember(target.id)
            .then(() => {
              util.hideLoading()
              util.showSuccess('已移除')
              logger.info('移除成员', { targetId: target.id })
              self.loadFamily()
            })
            .catch(err => {
              util.hideLoading()
              util.showError(err.message)
            })
        }
      }
    })
  },

  copyCode() {
    const self = this
    wx.setClipboardData({
      data: self.data.family.code,
      success() {
        wx.showToast({ title: '邀请码已复制', icon: 'success' })
      }
    })
  },
})
